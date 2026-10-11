import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  ApprovalStatus,
  ChangeRequest,
  ChangeRequestStatus,
  Commitment,
  Prisma,
  RiskLevel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeVerificationService } from '../scope-verification/scope-verification.service';
import { GetChangeRequestsQueryDto } from './dto/get-change-requests-query.dto';
import {
  ChangeRequestWithContext,
  ChangeRequestDetailDto,
  ChangeRequestResponseDto,
  ChangeRequestsMapper,
} from './dto/change-request-response.dto';

/** Context included wherever a change request is returned (single query — no N+1). */
export const CHANGE_REQUEST_CONTEXT_INCLUDE = {
  commitment: {
    include: { meeting: { select: { title: true } } },
  },
} satisfies Prisma.ChangeRequestInclude;

/** States from which the CR can still transition (open states). */
const OPEN_STATUSES: ChangeRequestStatus[] = [
  ChangeRequestStatus.PENDING,
  ChangeRequestStatus.CLARIFICATION_REQUESTED,
];

/**
 * Phase 11 — Change Request generation & approval workflow.
 *
 * Generation turns an unauthorized, out-of-scope (HIGH risk) commitment
 * into a PENDING change request using ONLY trusted server-side data: the
 * commitment itself plus the Phase 10 verification verdict. The client
 * cannot author or rewrite any fact. Approval is the sole path to
 * authorization: approving transactionally sets the CR to APPROVED and the
 * originating commitment to AUTHORIZED/LOW — the database decision is the
 * authority, never AI output.
 */
@Injectable()
export class ChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeVerification: ScopeVerificationService,
  ) {}

  /**
   * Generate a change request from an existing commitment.
   * Generation rules (business validation, not client opinion):
   *   - commitment must be verifiably out of scope (scopeMatch false),
   *   - no approved authorization may exist,
   *   - ambiguous verification must be resolved first,
   *   - at most one OPEN change request per commitment.
   * A previously REJECTED request does not block a fresh attempt — rejected
   * is terminal, and re-negotiation means a new request.
   */
  async generate(
    projectId: string,
    commitmentId: string,
  ): Promise<ChangeRequestDetailDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    const commitment = await this.prisma.commitment.findFirst({
      where: { id: commitmentId, projectId },
      include: { meeting: { select: { title: true } } },
    });
    if (!commitment) {
      throw new NotFoundException(
        `Commitment with id ${commitmentId} not found`,
      );
    }

    // Phase 10 verification is the source of truth for the generation
    // rules (deterministic DB state — also refreshes the stored verdict).
    const verification = await this.scopeVerification.verifyCommitment(
      projectId,
      commitmentId,
    );
    if (verification.scopeMatch === true) {
      throw new ConflictException(
        'Commitment is covered by approved scope — a change request is unnecessary',
      );
    }
    if (verification.authorizationFound) {
      throw new ConflictException(
        'Commitment is already authorized — a change request is unnecessary',
      );
    }
    if (verification.scopeMatch === null) {
      throw new ConflictException(
        'Scope verification for this commitment is ambiguous — resolve the verification before generating a change request',
      );
    }

    const open = await this.prisma.changeRequest.findFirst({
      where: {
        commitmentId,
        status: { in: OPEN_STATUSES },
      },
      select: { id: true },
    });
    if (open) {
      throw new ConflictException(
        'An open change request already exists for this commitment',
      );
    }

    const title = commitment.title;
    const description = `Promised by ${commitment.speaker ?? 'an unidentified speaker'} during "${commitment.meeting?.title ?? 'an unrecorded meeting'}": ${commitment.description ?? commitment.title} ${verification.explanation}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const cr = await tx.changeRequest.create({
        data: {
          projectId,
          commitmentId,
          title,
          description,
          status: ChangeRequestStatus.PENDING,
        },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.CHANGE_REQUEST_CREATED,
          entityType: ActivityEntityType.CHANGE_REQUEST,
          entityId: cr.id,
          description: `Change request "${title}" generated from commitment "${commitment.title}"`,
        },
      });

      return cr;
    });

    return this.findOne(projectId, created.id);
  }

  /** Project-scoped list with commitment/meeting context (single include). */
  async findAllByProject(
    projectId: string,
    query: GetChangeRequestsQueryDto,
  ): Promise<{
    items: ChangeRequestResponseDto[];
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  }> {
    await this.assertProjectExists(projectId);

    const where: Prisma.ChangeRequestWhereInput = {
      projectId,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' as const },
      }),
    };
    const orderBy: Prisma.ChangeRequestOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.changeRequest.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: CHANGE_REQUEST_CONTEXT_INCLUDE,
      }),
      this.prisma.changeRequest.count({ where }),
    ]);

    return {
      // Detail mapping on list rows too: the context include is already
      // loaded above, so this adds the commitment/meeting context (speaker,
      // source meeting) with no extra queries and no client-side N+1.
      items: items.map((cr) => ChangeRequestsMapper.toDetailDto(cr)),
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.limit)),
    };
  }

  async findOne(projectId: string, id: string): Promise<ChangeRequestDetailDto> {
    await this.assertProjectExists(projectId);

    const cr = await this.prisma.changeRequest.findFirst({
      where: { id, projectId },
      include: CHANGE_REQUEST_CONTEXT_INCLUDE,
    });
    if (!cr) {
      throw new NotFoundException(`Change request with id ${id} not found`);
    }
    return ChangeRequestsMapper.toDetailDto(cr);
  }

  /**
   * Approve → authorize. One transaction: CR status claim (conditional on
   * the CR still being open — race-safe), commitment AUTHORIZED/LOW, audit.
   * The database approval action is the ONLY path to authorization.
   */
  async approve(
    projectId: string,
    id: string,
    reason?: string,
  ): Promise<ChangeRequestDetailDto> {
    const cr = await this.getForDecision(projectId, id, 'approved');

    const updated = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.changeRequest.updateMany({
        where: { id, projectId, status: { in: OPEN_STATUSES } },
        data: {
          status: ChangeRequestStatus.APPROVED,
          ...(reason !== undefined && { approvalReason: reason }),
        },
      });
      if (claim.count === 0) {
        throw new ConflictException(
          'Change request is no longer open — only pending change requests can be approved',
        );
      }

      await tx.commitment.update({
        where: { id: cr.commitmentId },
        data: {
          authorizationStatus: ApprovalStatus.AUTHORIZED,
          riskLevel: RiskLevel.LOW,
        },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.CHANGE_REQUEST_APPROVED,
          entityType: ActivityEntityType.CHANGE_REQUEST,
          entityId: id,
          description: `Change request "${cr.title}" approved — commitment "${cr.commitment.title}" is now authorized`,
        },
      });

      return tx.changeRequest.findUniqueOrThrow({
        where: { id },
        include: CHANGE_REQUEST_CONTEXT_INCLUDE,
      });
    });

    return ChangeRequestsMapper.toDetailDto(updated);
  }

  /**
   * Reject → terminal. The commitment keeps its authorization state (still
   * unauthorized) and its risk is not downgraded — it stays HIGH unless a
   * later verification says otherwise.
   */
  async reject(
    projectId: string,
    id: string,
    reason?: string,
  ): Promise<ChangeRequestDetailDto> {
    const cr = await this.getForDecision(projectId, id, 'rejected');

    const updated = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.changeRequest.updateMany({
        where: { id, projectId, status: { in: OPEN_STATUSES } },
        data: { status: ChangeRequestStatus.REJECTED },
      });
      if (claim.count === 0) {
        throw new ConflictException(
          'Change request is no longer open — only pending change requests can be rejected',
        );
      }

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.CHANGE_REQUEST_REJECTED,
          entityType: ActivityEntityType.CHANGE_REQUEST,
          entityId: id,
          description: `Change request "${cr.title}" rejected${reason ? `: ${reason}` : ''}`,
        },
      });

      return tx.changeRequest.findUniqueOrThrow({
        where: { id },
        include: CHANGE_REQUEST_CONTEXT_INCLUDE,
      });
    });

    return ChangeRequestsMapper.toDetailDto(updated);
  }

  /**
   * Request clarification → the CR stays open but is flagged as needing
   * input. The comment is appended to any previous one (history preserved);
   * the commitment's authorization/risk are untouched.
   */
  async requestClarification(
    projectId: string,
    id: string,
    comment: string,
  ): Promise<ChangeRequestDetailDto> {
    const cr = await this.getForDecision(projectId, id, 'clarified');

    const updated = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.changeRequest.updateMany({
        where: { id, projectId, status: { in: OPEN_STATUSES } },
        data: {
          status: ChangeRequestStatus.CLARIFICATION_REQUESTED,
          clarificationComment: cr.clarificationComment
            ? `${cr.clarificationComment}\n---\n${comment}`
            : comment,
        },
      });
      if (claim.count === 0) {
        throw new ConflictException(
          'Change request is no longer open — clarification cannot be requested',
        );
      }

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.CHANGE_REQUEST_CLARIFICATION_REQUESTED,
          entityType: ActivityEntityType.CHANGE_REQUEST,
          entityId: id,
          description: `Clarification requested for change request "${cr.title}": ${comment}`,
        },
      });

      return tx.changeRequest.findUniqueOrThrow({
        where: { id },
        include: CHANGE_REQUEST_CONTEXT_INCLUDE,
      });
    });

    return ChangeRequestsMapper.toDetailDto(updated);
  }

  // ——— guards ———

  /** Ownership + existence (404), then transition validity (409). */
  private async getForDecision(
    projectId: string,
    id: string,
    action: string,
  ): Promise<ChangeRequest & { commitment: Commitment }> {
    await this.assertProjectExists(projectId);

    const cr = await this.prisma.changeRequest.findFirst({
      where: { id, projectId },
      include: { commitment: true },
    });
    if (!cr) {
      throw new NotFoundException(`Change request with id ${id} not found`);
    }

    if (!OPEN_STATUSES.includes(cr.status)) {
      throw new ConflictException(
        `Change request is already ${cr.status.toLowerCase()} — it cannot be ${action}`,
      );
    }
    return cr;
  }

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }
}
