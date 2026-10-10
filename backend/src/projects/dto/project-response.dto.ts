import { ActivityAction, ActivityEntityType, ProjectStatus } from '@prisma/client';

/** Single activity entry embedded in the project detail response. */
export class ActivitySummaryDto {
  id!: string;
  action!: ActivityAction;
  entityType!: ActivityEntityType;
  entityId!: string | null;
  description!: string;
  createdAt!: string;
}

/** Detail payload for GET /projects/:id — project + relationship counters. */
export class ProjectResponseDto {
  id!: string;
  name!: string;
  clientName!: string;
  description!: string | null;
  status!: ProjectStatus;
  budget!: number | null;
  startDate!: string | null;
  endDate!: string | null;
  createdAt!: string;
  updatedAt!: string;

  counts!: {
    scopeRequirements: number;
    meetings: number;
    commitments: number;
    changeRequests: number;
    documents: number;
  };

  latestActivity!: ActivitySummaryDto | null;
}
