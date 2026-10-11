import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActivityAction,
  ActivityEntityType,
  ApprovalStatus,
  ChangeRequestStatus,
  Commitment,
  RiskLevel,
  ScopeRequirement,
} from '@prisma/client';
import { matchScope, ScopeMatchOutcome } from './scope-matcher';
import {
  CommitmentVerificationResponseDto,
  MatchedScopeRequirementDto,
  VerificationAuthorizationSource,
} from './dto/verification-response.dto';

/**
 * Phase 10 — Scope Verification & Authorization Intelligence.
 *
 * Deterministic, explainable verification of a single commitment against
 * the owning project's approved scope and authorization records:
 *  - Scope matching is purely lexical over ScopeRequirement rows of the
 *    same project (see scope-matcher.ts; no pgvector, no AI).
 *  - Authorization is a database/business-rule decision: only an APPROVED
 *    ChangeRequest linked to this commitment (direct commitmentId FK) or
 *    coverage by an approved scope requirement counts. AI-provided
 *    authorizationStatus is never trusted.
 *  - Risk classification follows fixed PRD rules — the AI provider is
 *    never asked for and never decides the final risk.
 *
 * The result is also persisted onto the commitment's existing
 * riskLevel/authorizationStatus fields and audited once via a
 * COMMITMENT_VERIFIED activity; repeating an identical verification is a
 * no-op (no duplicate audit records).
 */
@Injectable()
export class ScopeVerificationService {
  private readonly logger = new Logger(ScopeVerificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async verifyCommitment(
    projectId: string,
    commitmentId: string,
  ): Promise<CommitmentVerificationResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    const commitment = await this.prisma.commitment.findFirst({
      where: { id: commitmentId, projectId },
    });
    if (!commitment) {
      throw new NotFoundException(
        `Commitment with id ${commitmentId} not found`,
      );
    }

    // Same-project scope only — one project's scope can never influence
    // another project's verification result.
    const requirements = await this.prisma.scopeRequirement.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Authorization source of truth: an APPROVED change request linked to
    // this commitment. PENDING / REJECTED / CANCELLED never authorize.
    const approvedChangeRequest = await this.prisma.changeRequest.findFirst({
      where: {
        commitmentId,
        projectId,
        status: ChangeRequestStatus.APPROVED,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const outcome = matchScope(
      `${commitment.title} ${commitment.description ?? ''}`,
      requirements,
    );

    // The matcher works on the minimal candidate shape; bridge back to the
    // full Prisma row so classification and the response carry full context.
    const matchedRequirement = outcome.requirement
      ? (requirements.find((r) => r.id === outcome.requirement!.id) ?? null)
      : null;

    const result = this.classify(
      { ...outcome, requirement: matchedRequirement },
      approvedChangeRequest,
    );

    return this.persistResult(commitment, result);
  }

  /**
   * Fixed, explainable risk rules (PRD):
   *  - LOW    — covered by approved scope, or out-of-scope but covered by
   *             an APPROVED change request.
   *  - MEDIUM — ambiguous scope match with no approved authorization.
   *  - HIGH   — clearly outside scope with no approved authorization.
   */
  private classify(
    outcome: ScopeMatchOutcome & { requirement: ScopeRequirement | null },
    approvedChangeRequest: { title: string } | null,
  ): {
    scopeMatch: boolean | null;
    matched: ScopeRequirement | null;
    authorizationFound: boolean;
    authorizationSource: VerificationAuthorizationSource | null;
    risk: RiskLevel;
    authorizationStatus: ApprovalStatus;
    explanation: string;
  } {
    // A NOT_MATCHED outcome still carries the least-bad candidate from the
    // ranking step — never expose it as a "match" in the result.
    const meaningful = outcome.status !== 'NOT_MATCHED';
    const matched = meaningful ? outcome.requirement : null;
    const matchedApproved =
      outcome.status === 'MATCHED' &&
      matched?.approvalStatus === ApprovalStatus.AUTHORIZED;

    if (matchedApproved) {
      return {
        scopeMatch: true,
        matched,
        authorizationFound: true,
        authorizationSource: 'APPROVED_SCOPE',
        risk: RiskLevel.LOW,
        authorizationStatus: ApprovalStatus.AUTHORIZED,
        explanation: `Commitment matches approved scope requirement: "${matched!.title}".`,
      };
    }

    if (approvedChangeRequest) {
      return {
        // Coverage by approved scope is the only thing that reports
        // scopeMatch=true; a merely lexical or pending-requirement overlap
        // stays ambiguous (null) — the approved change request is what
        // authorizes the work.
        scopeMatch: meaningful ? null : false,
        matched,
        authorizationFound: true,
        authorizationSource: 'CHANGE_REQUEST',
        risk: RiskLevel.LOW,
        authorizationStatus: ApprovalStatus.AUTHORIZED,
        explanation: `No approved scope requirement matches this commitment, but an approved change request ("${approvedChangeRequest.title}") authorizes it.`,
      };
    }

    if (meaningful) {
      // Ambiguous either way: partial lexical overlap, or a full lexical
      // match against a requirement that is not approved (yet).
      return {
        scopeMatch: null,
        matched,
        authorizationFound: false,
        authorizationSource: null,
        risk: RiskLevel.MEDIUM,
        authorizationStatus: ApprovalStatus.PENDING,
        explanation: `Commitment may relate to scope requirement "${matched!.title}", but the match is ambiguous and no approved authorization was found.`,
      };
    }

    return {
      scopeMatch: false,
      matched: null,
      authorizationFound: false,
      authorizationSource: null,
      risk: RiskLevel.HIGH,
      authorizationStatus: ApprovalStatus.UNAUTHORIZED,
      explanation:
        'No approved scope requirement matches this commitment and no approved authorization was found.',
    };
  }

  /**
   * Persist the verification outcome onto the commitment's existing fields
   * (riskLevel / authorizationStatus — no new tables) and record a single
   * COMMITMENT_VERIFIED audit entry. Re-running a verification whose
   * conclusion is unchanged is a no-op, so repeat requests never create
   * duplicate audit records.
   */
  private async persistResult(
    commitment: Commitment,
    result: {
      scopeMatch: boolean | null;
      matched: ScopeRequirement | null;
      authorizationFound: boolean;
      authorizationSource: VerificationAuthorizationSource | null;
      risk: RiskLevel;
      authorizationStatus: ApprovalStatus;
      explanation: string;
    },
  ): Promise<CommitmentVerificationResponseDto> {
    const previous = await this.prisma.activity.findFirst({
      where: {
        projectId: commitment.projectId,
        entityType: ActivityEntityType.COMMITMENT,
        entityId: commitment.id,
        action: ActivityAction.COMMITMENT_VERIFIED,
      },
      orderBy: { createdAt: 'desc' },
    });

    const unchanged =
      commitment.riskLevel === result.risk &&
      commitment.authorizationStatus === result.authorizationStatus &&
      previous?.description === result.explanation;

    let verifiedAt: Date;
    if (unchanged) {
      verifiedAt = previous!.createdAt;
    } else {
      const [updated] = await this.prisma.$transaction([
        this.prisma.commitment.update({
          where: { id: commitment.id },
          data: {
            riskLevel: result.risk,
            authorizationStatus: result.authorizationStatus,
          },
        }),
        this.prisma.activity.create({
          data: {
            projectId: commitment.projectId,
            action: ActivityAction.COMMITMENT_VERIFIED,
            entityType: ActivityEntityType.COMMITMENT,
            entityId: commitment.id,
            description: result.explanation,
          },
        }),
      ]);
      commitment = updated;
      verifiedAt = updated.updatedAt;
    }

    return {
      commitmentId: commitment.id,
      scopeMatch: result.scopeMatch,
      matchedScopeRequirement: result.matched
        ? this.toMatchedDto(result.matched)
        : null,
      authorizationFound: result.authorizationFound,
      authorizationSource: result.authorizationSource,
      risk: result.risk,
      authorizationStatus: result.authorizationStatus,
      explanation: result.explanation,
      evidence: this.collectEvidence(commitment, result.matched),
      verifiedAt: verifiedAt.toISOString(),
    };
  }

  private toMatchedDto(requirement: ScopeRequirement): MatchedScopeRequirementDto {
    return {
      id: requirement.id,
      title: requirement.title,
      category: requirement.category,
      approvalStatus: requirement.approvalStatus,
    };
  }

  /**
   * Supporting references for the decision — the commitment's evidence
   * pointer plus the matched requirement's contract clause. Explanatory
   * metadata only; the matcher itself never uses them.
   */
  private collectEvidence(
    commitment: Commitment,
    matched: ScopeRequirement | null,
  ): string[] {
    const evidence: string[] = [];
    if (commitment.evidenceReference) {
      evidence.push(commitment.evidenceReference);
    }
    if (matched?.sourceClause) {
      evidence.push(matched.sourceClause);
    }
    return evidence;
  }

  /**
   * Fire-and-forget verification used by the meeting-analysis pipeline
   * AFTER its transaction has committed. A verification failure must never
   * roll back or fail the analysis — it is logged and skipped.
   */
  async verifyCreatedCommitments(
    projectId: string,
    commitmentIds: string[],
  ): Promise<void> {
    for (const commitmentId of commitmentIds) {
      try {
        await this.verifyCommitment(projectId, commitmentId);
      } catch (error) {
        this.logger.warn(
          `Post-analysis scope verification failed for commitment ${commitmentId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
