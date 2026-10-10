import { ApprovalStatus, RiskLevel } from '@prisma/client';
import { ActivitySummaryDto } from '../../projects/dto/project-response.dto';

/** List-item contract for both GET surfaces. */
export class CommitmentResponseDto {
  id!: string;
  projectId!: string;
  meetingId!: string;
  meetingTitle!: string;
  title!: string;
  speaker!: string;
  riskLevel!: RiskLevel;
  authorizationStatus!: ApprovalStatus;
  confidenceScore!: number | null;
  createdAt!: string;
  updatedAt!: string;
  latestActivity!: ActivitySummaryDto | null;
}

/** Detail contract — adds the full fields plus meeting/project context and evidence count. */
export class CommitmentDetailResponseDto extends CommitmentResponseDto {
  description!: string;
  evidenceReference!: string | null;
  meetingSummary!: string | null;
  projectName!: string;
  projectSummary!: string | null;
  evidenceCount!: number;
}
