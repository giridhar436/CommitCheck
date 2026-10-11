import {
  Commitment,
  ChangeRequest,
  RiskLevel,
  ApprovalStatus,
} from '@prisma/client';

/**
 * A generated change request carries no client-authored facts: title comes
 * from the commitment, description from the commitment + Phase 10
 * verification, and the commitment/meeting context is included at read time
 * (no duplicated storage).
 */
export class ChangeRequestResponseDto {
  id!: string;
  projectId!: string;
  commitmentId!: string;
  title!: string;
  description!: string | null;
  status!: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CLARIFICATION_REQUESTED';
  approvalReason!: string | null;
  clarificationComment!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

/** Detail = response + the originating commitment/meeting context. */
export class ChangeRequestDetailDto extends ChangeRequestResponseDto {
  commitment!: {
    id: string;
    title: string;
    speaker: string | null;
    riskLevel: RiskLevel;
    authorizationStatus: ApprovalStatus;
    meetingId: string;
  };
  meetingTitle!: string | null;
}

/** Shape the service hands to the mapper (commitment + meeting title included). */
export type ChangeRequestWithContext = ChangeRequest & {
  commitment: Commitment & { meeting?: { title: string } | null };
};

export class ChangeRequestsMapper {
  static toDto(cr: ChangeRequest): ChangeRequestResponseDto {
    return {
      id: cr.id,
      projectId: cr.projectId,
      commitmentId: cr.commitmentId,
      title: cr.title,
      description: cr.description,
      status: cr.status,
      approvalReason: cr.approvalReason,
      clarificationComment: cr.clarificationComment,
      createdAt: cr.createdAt.toISOString(),
      updatedAt: cr.updatedAt.toISOString(),
    };
  }

  static toDetailDto(cr: ChangeRequestWithContext): ChangeRequestDetailDto {
    return {
      ...this.toDto(cr),
      commitment: {
        id: cr.commitment.id,
        title: cr.commitment.title,
        speaker: cr.commitment.speaker,
        riskLevel: cr.commitment.riskLevel,
        authorizationStatus: cr.commitment.authorizationStatus,
        meetingId: cr.commitment.meetingId,
      },
      meetingTitle: cr.commitment.meeting?.title ?? null,
    };
  }
}
