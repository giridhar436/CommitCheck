import { ApprovalStatus, Priority } from '@prisma/client';

/** Full JSON contract for a scope requirement. */
export class ScopeRequirementResponseDto {
  id!: string;
  projectId!: string;
  title!: string;
  description!: string | null;
  category!: string;
  priority!: Priority;
  approvalStatus!: ApprovalStatus;
  sourceClause!: string | null;
  acceptanceCriteria!: string | null;
  createdAt!: string;
  updatedAt!: string;
}
