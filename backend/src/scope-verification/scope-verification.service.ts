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
  RetrievedContextItemDto,
  VerificationAuthorizationSource,
} from './dto/verification-response.dto';
import { RetrievalService } from '../retrieval/retrieval.service';
import { NotificationsService } from '../notifications/notifications.service';

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
/** Requirement row as loaded by verifyCommitment — with the Phase 13 source-document relation. */
type RequirementWithSource = ScopeRequirement & {
  sourceDocument: { id: string; title: string } | null;
};

@Injectable()
export class ScopeVerificationService {
  private readonly logger = new Logger(ScopeVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retrieval: RetrievalService,
    private readonly notifications: NotificationsService,
  ) {}

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
    // another project's verification result. sourceDocument rides along
    // (Phase 13 traceability) so the response can show where a matched
    // requirement came from.
    const requirements = await this.prisma.scopeRequirement.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: { sourceDocument: { select: { id: true, title: true } } },
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
    outcome: ScopeMatchOutcome & { requirement: RequirementWithSource | null },
    approvedChangeRequest: { title: string } | null,
  ): {
    scopeMatch: boolean | null;
    matched: RequirementWithSource | null;
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
      matched: RequirementWithSource | null;
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

      // Post-commit hook — a HIGH + UNAUTHORIZED verdict is the platform's
      // core alert. Fired AFTER the transaction so a notification problem
      // can never corrupt the verification; notify() itself never throws
      // and the event key dedupes re-alerts for the same commitment state.
      if (result.risk === RiskLevel.HIGH && result.authorizationStatus === ApprovalStatus.UNAUTHORIZED) {
        await this.notifyHighRiskUnauthorized(commitment, result.explanation);
      }
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
      // Phase 14 — retrieval enrichment only when nothing authorized the
      // commitment: human-review context, never decision input.
      ...(result.authorizationSource === null
        ? { retrievedContext: await this.collectRetrievedContext(commitment) }
        : {}),
    };
  }

  /** Approval-capable audience alert for a HIGH+UNAUTHORIZED verdict. */
  private async notifyHighRiskUnauthorized(
    commitment: Commitment,
    explanation: string,
  ): Promise<void> {
    try {
      const recipients = await this.notifications.resolveApprovers(commitment.projectId);
      await this.notifications
        .notify({
          eventKey: `verify:high-unauthorized:${commitment.id}`,
          type: 'verification.high_risk_unauthorized',
          projectId: commitment.projectId,
          entityType: ActivityEntityType.COMMITMENT,
          entityId: commitment.id,
          recipients,
          subject: `High-risk unauthorized commitment: ${commitment.title}`,
          body: `Verification flagged "${commitment.title}" as HIGH risk and unauthorized. ${explanation} Review it and generate a change request if the work is required.`,
        })
        .catch(() => undefined);
    } catch (error) {
      this.logger.warn(
        `High-risk notification flow failed (verification result unaffected): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private toMatchedDto(requirement: RequirementWithSource): MatchedScopeRequirementDto {
    return {
      id: requirement.id,
      title: requirement.title,
      category: requirement.category,
      approvalStatus: requirement.approvalStatus,
      sourceDocument: requirement.sourceDocument
        ? { id: requirement.sourceDocument.id, title: requirement.sourceDocument.title }
        : null,
    };
  }

  /**
   * Supporting references for the decision — the commitment's evidence
   * pointer plus the matched requirement's contract clause. Explanatory
   * metadata only; the matcher itself never uses them.
   */
  private collectEvidence(
    commitment: Commitment,
    matched: RequirementWithSource | null,
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
   * Phase 14 — retrieval-based review context. Queries the project-scoped
   * retrieval service (candidate discovery only) and returns stored chunk
   * excerpts for human review. Best-effort: any failure is logged and
   * omitted — a retrieval outage can never alter a verification verdict.
   */
  private async collectRetrievedContext(
    commitment: Commitment,
  ): Promise<RetrievedContextItemDto[] | undefined> {
    try {
      const retrieval = await this.retrieval.retrieveRelevantScope(commitment.projectId, {
        query: `${commitment.title} ${commitment.description ?? ''}`.trim(),
        limit: 3,
      });
      const items = retrieval.results
        .filter((r) => r.sourceType === 'DOCUMENT_CHUNK' && r.documentId && r.documentTitle)
        .map(
          (r): RetrievedContextItemDto => ({
            documentId: r.documentId!,
            documentTitle: r.documentTitle!,
            chunkIndex: r.metadata.chunkIndex ?? 0,
            text: r.text,
            relevance: r.score,
          }),
        );
      return items.length > 0 ? items : undefined;
    } catch (error) {
      this.logger.warn(
        `Retrieval enrichment failed (omitted from verification response): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return undefined;
    }
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
