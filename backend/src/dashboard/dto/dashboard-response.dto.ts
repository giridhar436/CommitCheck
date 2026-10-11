import { ActivityAction, ActivityEntityType } from '@prisma/client';

/**
 * Phase 12 — dashboard / alerts / activity response contracts.
 * Every number comes from real database aggregation (count/groupBy);
 * no AI involvement and no client-computable values.
 */

export class DashboardSummaryDto {
  scopeRequirements!: number;
  meetings!: number;
  commitments!: number;
  unauthorizedCommitments!: number;
  highRiskCommitments!: number;
  pendingChangeRequests!: number;
  approvedChangeRequests!: number;
  rejectedChangeRequests!: number;
}

export class CommitmentBreakdownDto {
  total!: number;
  authorized!: number;
  unauthorized!: number;
  pending!: number;
  highRisk!: number;
  mediumRisk!: number;
  lowRisk!: number;
}

export class ChangeRequestBreakdownDto {
  pending!: number;
  clarificationRequested!: number;
  approved!: number;
  rejected!: number;
}

/** Actionable, navigation-ready item (HIGH-risk unauthorized commitments,
 *  pending/clarification change requests, ambiguous verifications). */
export class AttentionItemDto {
  type!:
    | 'UNAUTHORIZED_COMMITMENT'
    | 'AMBIGUOUS_VERIFICATION'
    | 'PENDING_CHANGE_REQUEST'
    | 'CLARIFICATION_REQUESTED';
  severity!: 'HIGH' | 'MEDIUM';
  title!: string;
  description!: string;
  commitmentId!: string | null;
  changeRequestId!: string | null;
  meetingId!: string | null;
  createdAt!: string;
}

/** Activity entry enriched with entity ids for navigation — ids are resolved
 *  in batched lookups (no N+1); no actor identities exist in the schema. */
export class ActivityItemDto {
  id!: string;
  action!: ActivityAction;
  entityType!: ActivityEntityType;
  entityId!: string | null;
  entityTitle!: string | null;
  description!: string;
  projectId!: string;
  meetingId!: string | null;
  commitmentId!: string | null;
  changeRequestId!: string | null;
  createdAt!: string;
}

/** Deterministic, database-backed actionable alert. */
export class AlertDto {
  id!: string;
  type!: AttentionItemDto['type'];
  severity!: AttentionItemDto['severity'];
  title!: string;
  description!: string;
  commitmentId!: string | null;
  changeRequestId!: string | null;
  meetingId!: string | null;
  createdAt!: string;
}

export class DashboardResponseDto {
  project!: { id: string; name: string };
  summary!: DashboardSummaryDto;
  commitments!: CommitmentBreakdownDto;
  changeRequests!: ChangeRequestBreakdownDto;
  recentActivity!: ActivityItemDto[];
  attentionItems!: AttentionItemDto[];
}
