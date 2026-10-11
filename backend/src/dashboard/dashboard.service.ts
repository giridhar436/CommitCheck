import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityAction, ActivityEntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import {
  ActivityItemDto,
  AlertDto,
  AttentionItemDto,
} from './dto/dashboard-response.dto';
import { GetActivityQueryDto } from './dto/get-activity-query.dto';

/** Upper bound for one page of actionable rows — keeps queries cheap. */
const ATTENTION_TAKE = 50;
/** Bounded recent-activity window for the dashboard payload. */
const RECENT_ACTIVITY_TAKE = 25;

type AttentionRow = AttentionItemDto & { entityId: string };

/**
 * Phase 12 — Dashboard, alerts & audit intelligence.
 * Read-only aggregations over the existing models; all values come from
 * real database state (count/groupBy) — never AI output, never client data.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(projectId: string): Promise<DashboardResponseDto> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [scopeRequirements, meetings, commitmentTotal, commitmentGroups, changeRequestGroups, attentionItems, recentActivity] =
      await Promise.all([
        this.prisma.scopeRequirement.count({ where: { projectId } }),
        this.prisma.meeting.count({ where: { projectId } }),
        this.prisma.commitment.count({ where: { projectId } }),
        // One groupBy covers both the authorization and the risk breakdowns.
        this.prisma.commitment.groupBy({
          by: ['authorizationStatus', 'riskLevel'],
          where: { projectId },
          _count: { _all: true },
        }),
        this.prisma.changeRequest.groupBy({
          by: ['status'],
          where: { projectId },
          _count: { _all: true },
        }),
        this.getAttentionRows(projectId),
        this.getActivityItems(projectId, { take: RECENT_ACTIVITY_TAKE }),
      ]);

    const crCount = (status: string) =>
      changeRequestGroups
        .filter((g) => g.status === status)
        .reduce((sum, g) => sum + g._count._all, 0);

    const commitmentCount = (authorization: string, risk?: string) =>
      commitmentGroups
        .filter(
          (g) =>
            g.authorizationStatus === authorization &&
            (!risk || g.riskLevel === risk),
        )
        .reduce((sum, g) => sum + g._count._all, 0);

    const riskCount = (risk: string) =>
      commitmentGroups
        .filter((g) => g.riskLevel === risk)
        .reduce((sum, g) => sum + g._count._all, 0);

    const pendingCr = crCount('PENDING');
    const clarificationCr = crCount('CLARIFICATION_REQUESTED');

    return {
      project,
      summary: {
        scopeRequirements,
        meetings,
        commitments: commitmentTotal,
        unauthorizedCommitments: commitmentCount('UNAUTHORIZED'),
        highRiskCommitments: riskCount('HIGH'),
        // Open change requests — anything still awaiting a client decision.
        pendingChangeRequests: pendingCr + clarificationCr,
        approvedChangeRequests: crCount('APPROVED'),
        rejectedChangeRequests: crCount('REJECTED'),
      },
      commitments: {
        total: commitmentTotal,
        authorized: commitmentCount('AUTHORIZED'),
        unauthorized: commitmentCount('UNAUTHORIZED'),
        pending: commitmentCount('PENDING'),
        highRisk: riskCount('HIGH'),
        mediumRisk: riskCount('MEDIUM'),
        lowRisk: riskCount('LOW'),
      },
      changeRequests: {
        pending: pendingCr,
        clarificationRequested: clarificationCr,
        approved: crCount('APPROVED'),
        rejected: crCount('REJECTED'),
      },
      recentActivity: recentActivity,
      attentionItems: attentionItems.map(({ entityId: _id, ...item }) => {
        void _id;
        return item;
      }),
    };
  }

  /** Paginated, project-scoped audit trail over the existing Activity rows. */
  async getActivity(projectId: string, query: GetActivityQueryDto) {
    await this.assertProjectExists(projectId);

    const where: Prisma.ActivityWhereInput = {
      projectId,
      ...(query.action && { action: query.action }),
    };

    const [activities, totalItems] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    const items = await this.enrichActivities(projectId, activities);

    return {
      items,
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.limit)),
    };
  }

  /** Currently actionable, deterministic alerts derived from database state. */
  async getAlerts(projectId: string): Promise<AlertDto[]> {
    await this.assertProjectExists(projectId);
    const rows = await this.getAttentionRows(projectId);
    return rows.map((row) => ({
      id: `${row.type}-${row.entityId}`,
      type: row.type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      commitmentId: row.commitmentId,
      changeRequestId: row.changeRequestId,
      meetingId: row.meetingId,
      createdAt: row.createdAt,
    }));
  }

  // ——— internals ———

  private async assertProjectExists(projectId: string): Promise<void> {
    const exists = await this.prisma.project.findFirst({
      where: { id: projectId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Project not found');
    }
  }

  /** Actionable commitments + open change requests (two batched queries). */
  private async getAttentionRows(projectId: string): Promise<AttentionRow[]> {
    const [commitments, changeRequests] = await Promise.all([
      this.prisma.commitment.findMany({
        where: {
          projectId,
          OR: [
            // High-risk scope creep without authorization.
            { riskLevel: 'HIGH', authorizationStatus: 'UNAUTHORIZED' },
            // Ambiguous verification — needs human review.
            { authorizationStatus: 'PENDING' },
          ],
        },
        select: {
          id: true,
          title: true,
          meetingId: true,
          riskLevel: true,
          authorizationStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: ATTENTION_TAKE,
      }),
      this.prisma.changeRequest.findMany({
        where: { projectId, status: { in: ['PENDING', 'CLARIFICATION_REQUESTED'] } },
        select: {
          id: true,
          title: true,
          status: true,
          commitmentId: true,
          createdAt: true,
          commitment: { select: { meetingId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: ATTENTION_TAKE,
      }),
    ]);

    const commitmentAlerts: AttentionRow[] = commitments.map((c) => ({
      entityId: c.id,
      type:
        c.authorizationStatus === 'PENDING'
          ? 'AMBIGUOUS_VERIFICATION'
          : 'UNAUTHORIZED_COMMITMENT',
      severity: c.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
      title: c.title,
      description:
        c.authorizationStatus === 'PENDING'
          ? 'Scope verification was ambiguous — this commitment needs human review before work starts.'
          : 'High-risk commitment outside approved scope and unauthorized — awaiting a change request or a scope update.',
      commitmentId: c.id,
      changeRequestId: null,
      meetingId: c.meetingId,
      createdAt: c.createdAt.toISOString(),
    }));

    const changeRequestAlerts: AttentionRow[] = changeRequests.map((cr) => ({
      entityId: cr.id,
      type:
        cr.status === 'CLARIFICATION_REQUESTED'
          ? 'CLARIFICATION_REQUESTED'
          : 'PENDING_CHANGE_REQUEST',
      severity: 'MEDIUM',
      title: cr.title,
      description:
        cr.status === 'CLARIFICATION_REQUESTED'
          ? 'Clarification was requested on this change request — it still awaits a decision.'
          : 'Change request is pending approval — approving it authorizes the linked commitment.',
      commitmentId: cr.commitmentId,
      changeRequestId: cr.id,
      meetingId: cr.commitment?.meetingId ?? null,
      createdAt: cr.createdAt.toISOString(),
    }));

    // Highest severity and newest first.
    return [...commitmentAlerts, ...changeRequestAlerts].sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }

  private async getActivityItems(
    projectId: string,
    options: { take: number; skip?: number; action?: ActivityAction; orderBy?: Prisma.ActivityOrderByWithRelationInput },
  ): Promise<ActivityItemDto[]> {
    const activities = await this.prisma.activity.findMany({
      where: {
        projectId,
        ...(options.action && { action: options.action }),
      },
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
    });
    return this.enrichActivities(projectId, activities);
  }

  /** Resolve polymorphic entityId → navigable context with ONE batched
   *  findMany per entity type present (no N+1). */
  private async enrichActivities(
    projectId: string,
    activities: Array<{
      id: string;
      action: ActivityAction;
      entityType: ActivityEntityType;
      entityId: string | null;
      description: string;
      createdAt: Date;
    }>,
  ): Promise<ActivityItemDto[]> {
    const idsByType = new Map<ActivityEntityType, string[]>();
    for (const a of activities) {
      if (!a.entityId) continue;
      const ids = idsByType.get(a.entityType) ?? [];
      ids.push(a.entityId);
      idsByType.set(a.entityType, ids);
    }

    const [meetings, commitments, changeRequests, requirements, attachments] =
      await Promise.all([
        idsByType.get('MEETING') &&
          this.prisma.meeting.findMany({
            where: { projectId, id: { in: idsByType.get('MEETING') } },
            select: { id: true, title: true },
          }),
        idsByType.get('COMMITMENT') &&
          this.prisma.commitment.findMany({
            where: { projectId, id: { in: idsByType.get('COMMITMENT') } },
            select: { id: true, title: true, meetingId: true },
          }),
        idsByType.get('CHANGE_REQUEST') &&
          this.prisma.changeRequest.findMany({
            where: { projectId, id: { in: idsByType.get('CHANGE_REQUEST') } },
            select: { id: true, title: true, commitmentId: true, commitment: { select: { meetingId: true } } },
          }),
        idsByType.get('SCOPE_REQUIREMENT') &&
          this.prisma.scopeRequirement.findMany({
            where: { projectId, id: { in: idsByType.get('SCOPE_REQUIREMENT') } },
            select: { id: true, title: true },
          }),
        idsByType.get('MEETING_ATTACHMENT') &&
          this.prisma.meetingAttachment.findMany({
            // Attachments relate to the project through their meeting.
            where: { id: { in: idsByType.get('MEETING_ATTACHMENT') }, meeting: { projectId } },
            select: { id: true, fileName: true, meetingId: true },
          }),
      ]);

    const meetingById = new Map((meetings ?? []).map((m) => [m.id, m]));
    const commitmentById = new Map((commitments ?? []).map((c) => [c.id, c]));
    const changeRequestById = new Map((changeRequests ?? []).map((c) => [c.id, c]));
    const requirementById = new Map((requirements ?? []).map((r) => [r.id, r]));
    const attachmentById = new Map((attachments ?? []).map((a) => [a.id, a]));

    return activities.map((a) => {
      const id = a.entityId;
      const meeting =
        a.entityType === 'MEETING' && id ? meetingById.get(id) : undefined;
      const commitment =
        a.entityType === 'COMMITMENT' && id ? commitmentById.get(id) : undefined;
      const changeRequest =
        a.entityType === 'CHANGE_REQUEST' && id ? changeRequestById.get(id) : undefined;
      const requirement =
        a.entityType === 'SCOPE_REQUIREMENT' && id ? requirementById.get(id) : undefined;
      const attachment =
        a.entityType === 'MEETING_ATTACHMENT' && id ? attachmentById.get(id) : undefined;

      const meetingId =
        meeting?.id ??
        commitment?.meetingId ??
        changeRequest?.commitment?.meetingId ??
        attachment?.meetingId ??
        null;

      return {
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        entityTitle:
          meeting?.title ??
          commitment?.title ??
          changeRequest?.title ??
          requirement?.title ??
          attachment?.fileName ??
          null,
        description: a.description,
        projectId,
        meetingId,
        commitmentId: commitment?.id ?? changeRequest?.commitmentId ?? null,
        changeRequestId: changeRequest?.id ?? null,
        createdAt: a.createdAt.toISOString(),
      };
    });
  }
}
