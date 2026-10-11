import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Activity,
  ActivityAction,
  ActivityEntityType,
  ApprovalStatus,
  Prisma,
  RiskLevel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
import { GetCommitmentsQueryDto } from './dto/get-commitments-query.dto';
import { UpdateCommitmentDto } from './dto/update-commitment.dto';
import {
  CommitmentDetailResponseDto,
  CommitmentResponseDto,
} from './dto/commitment-response.dto';
import { Paginated } from '../common/api-response';
import { CommitmentsMapper } from './commitments.mapper';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';

/** Meeting/project context for responses; evidence is reduced to a count. */
export const COMMITMENT_CONTEXT_INCLUDE = {
  meeting: { select: { title: true, summary: true } },
  project: { select: { name: true, description: true } },
  _count: { select: { evidence: true } },
} satisfies Prisma.CommitmentInclude;

@Injectable()
export class CommitmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Project-scoped list: search + status/risk/speaker/meeting filters + sorting. */
  async findAllByProject(
    projectId: string,
    query: GetCommitmentsQueryDto,
  ): Promise<Paginated<CommitmentResponseDto>> {
    await this.assertProjectExists(projectId);
    return this.findAll({ projectId }, query);
  }

  /** Meeting-scoped list backing the Meeting Details page. */
  async findAllByMeeting(
    meetingId: string,
    query: GetCommitmentsQueryDto,
  ): Promise<Paginated<CommitmentResponseDto>> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, projectId: true },
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${meetingId} not found`);
    }
    return this.findAll({ meetingId }, query, meeting.projectId);
  }

  /** Full detail: commitment fields + meeting/project context + evidence count. */
  async findOne(projectId: string, id: string): Promise<CommitmentDetailResponseDto> {
    const commitment = await this.prisma.commitment.findFirst({
      where: { id, projectId },
      include: COMMITMENT_CONTEXT_INCLUDE,
    });
    if (!commitment) {
      throw new NotFoundException(`Commitment with id ${id} not found`);
    }
    return CommitmentsMapper.toDetailDto(
      commitment,
      await this.latestActivityOf(projectId, id),
    );
  }

  /**
   * Creates the commitment + audit entry in one transaction. meetingId comes
   * from the body, so ownership is verified: the meeting must exist AND belong
   * to the project in the route (projectId is never taken from the client).
   */
  async create(projectId: string, dto: CreateCommitmentDto): Promise<CommitmentResponseDto> {
    await this.assertProjectExists(projectId);
    const meeting = await this.assertMeetingForProject(projectId, dto.meetingId);

    const commitment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.commitment.create({
        data: {
          projectId,
          meetingId: meeting.id,
          title: dto.title,
          description: dto.description,
          speaker: dto.speaker,
          riskLevel: dto.riskLevel ?? RiskLevel.LOW,
          // Phase 11 security: clients never set authorization directly —
          // only an approved Change Request (or Phase 10 verification) can.
          authorizationStatus: ApprovalStatus.PENDING,
          confidenceScore: dto.confidenceScore,
          evidenceReference: dto.evidenceReference,
        },
        include: COMMITMENT_CONTEXT_INCLUDE,
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.COMMITMENT_CREATED,
          entityType: ActivityEntityType.COMMITMENT,
          entityId: created.id,
          description: `Commitment "${created.title}" recorded for meeting "${created.meeting.title}"`,
        },
      });

      return created;
    });

    return CommitmentsMapper.toListDto(commitment);
  }

  /** Partial update; a new meetingId is re-verified against the same project. */
  async update(
    projectId: string,
    id: string,
    dto: UpdateCommitmentDto,
  ): Promise<CommitmentResponseDto> {
    const existing = await this.prisma.commitment.findFirst({
      where: { id, projectId },
      select: { id: true, title: true, meetingId: true },
    });
    if (!existing) {
      throw new NotFoundException(`Commitment with id ${id} not found`);
    }

    if (dto.meetingId !== undefined && dto.meetingId !== existing.meetingId) {
      await this.assertMeetingForProject(projectId, dto.meetingId);
    }

    const data: Prisma.CommitmentUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.speaker !== undefined && { speaker: dto.speaker }),
      ...(dto.meetingId !== undefined && {
        meeting: { connect: { id: dto.meetingId } },
      }),
      ...(dto.riskLevel !== undefined && { riskLevel: dto.riskLevel }),
      ...(dto.confidenceScore !== undefined && { confidenceScore: dto.confidenceScore }),
      ...(dto.evidenceReference !== undefined && { evidenceReference: dto.evidenceReference }),
    };

    const [commitment] = await this.prisma.$transaction([
      this.prisma.commitment.update({
        where: { id },
        data,
        include: COMMITMENT_CONTEXT_INCLUDE,
      }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.COMMITMENT_UPDATED,
          entityType: ActivityEntityType.COMMITMENT,
          entityId: id,
          description: `Commitment "${dto.title ?? existing.title}" updated (${Object.keys(dto).join(', ')})`,
        },
      }),
    ]);

    return CommitmentsMapper.toListDto(commitment);
  }

  /**
   * Deletes the commitment and logs the deletion in one transaction. The log
   * survives (it points at the still-existing project); the schema cascade
   * removes the commitment's evidence rows.
   */
  async remove(projectId: string, id: string): Promise<{ id: string; title: string }> {
    const existing = await this.prisma.commitment.findFirst({
      where: { id, projectId },
      select: { id: true, title: true },
    });
    if (!existing) {
      throw new NotFoundException(`Commitment with id ${id} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.commitment.delete({ where: { id } }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.COMMITMENT_DELETED,
          entityType: ActivityEntityType.COMMITMENT,
          entityId: existing.id,
          description: `Commitment "${existing.title}" deleted`,
        },
      }),
    ]);

    return existing;
  }

  // ——— shared internals ———

  /** Core list used by both surfaces; `scope` pins the boundary, projectId
   *  feeds the activity lookup (taken from the meeting for the meeting surface). */
  private async findAll(
    scope: { projectId: string } | { meetingId: string },
    query: GetCommitmentsQueryDto,
    activityProjectId?: string,
  ): Promise<Paginated<CommitmentResponseDto>> {
    const projectId = 'projectId' in scope ? scope.projectId : activityProjectId;
    const { page, limit, search, authorizationStatus, riskLevel, speaker, meetingId, sortBy, sortOrder, skip } =
      query;

    const where: Prisma.CommitmentWhereInput = {
      ...scope,
      ...(authorizationStatus ? { authorizationStatus } : {}),
      ...(riskLevel ? { riskLevel } : {}),
      ...('projectId' in scope && meetingId ? { meetingId } : {}),
      ...(speaker
        ? { speaker: { equals: speaker.trim(), mode: 'insensitive' } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { speaker: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const commitments = await this.prisma.commitment.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: COMMITMENT_CONTEXT_INCLUDE,
    });
    const totalItems = await this.prisma.commitment.count({ where });

    // One batched lookup for the page's latest activities (avoids N+1).
    const commitmentIds = commitments.map((c) => c.id);
    const activities = await this.prisma.activity.findMany({
      where: {
        projectId,
        entityType: ActivityEntityType.COMMITMENT,
        entityId: { in: commitmentIds },
      },
      orderBy: { createdAt: 'desc' },
    });
    const latestByCommitment = new Map<string, ActivitySummaryDto>();
    for (const activity of activities) {
      if (activity.entityId && !latestByCommitment.has(activity.entityId)) {
        latestByCommitment.set(activity.entityId, this.toActivitySummary(activity));
      }
    }

    return {
      items: commitments.map((commitment) =>
        CommitmentsMapper.toListDto(commitment, latestByCommitment.get(commitment.id) ?? null),
      ),
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
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

  /**
   * The meeting must exist (404) and belong to the project (400) — the
   * distinction is deliberate: a missing meeting is a not-found reference,
   * a meeting from another project is an invalid combination.
   */
  private async assertMeetingForProject(
    projectId: string,
    meetingId: string,
  ): Promise<{ id: string }> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, projectId: true },
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${meetingId} not found`);
    }
    if (meeting.projectId !== projectId) {
      throw new BadRequestException(
        `Meeting ${meetingId} does not belong to project ${projectId}`,
      );
    }
    return meeting;
  }

  private async latestActivityOf(
    projectId: string,
    commitmentId: string,
  ): Promise<ActivitySummaryDto | null> {
    const activity = await this.prisma.activity.findFirst({
      where: { projectId, entityType: ActivityEntityType.COMMITMENT, entityId: commitmentId },
      orderBy: { createdAt: 'desc' },
    });
    return activity ? this.toActivitySummary(activity) : null;
  }

  private toActivitySummary(activity: Activity): ActivitySummaryDto {
    return {
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    };
  }
}
