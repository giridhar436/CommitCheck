import { Prisma } from '@prisma/client';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';
import { CommitmentDetailResponseDto, CommitmentResponseDto } from './dto/commitment-response.dto';

type CommitmentWithContext = Prisma.CommitmentGetPayload<{
  include: {
    meeting: { select: { title: true; summary: true } };
    project: { select: { name: true; description: true } };
    _count: { select: { evidence: true } };
  };
}>;

/**
 * Maps Prisma rows to the API's JSON contract:
 * dates → ISO strings, meeting/project context attached, evidence → count only.
 */
export class CommitmentsMapper {
  static toListDto(
    commitment: CommitmentWithContext & { meeting: { title: string } },
    latestActivity?: ActivitySummaryDto | null,
  ): CommitmentResponseDto {
    return {
      id: commitment.id,
      projectId: commitment.projectId,
      meetingId: commitment.meetingId,
      meetingTitle: commitment.meeting.title,
      title: commitment.title,
      speaker: commitment.speaker ?? '',
      riskLevel: commitment.riskLevel,
      authorizationStatus: commitment.authorizationStatus,
      confidenceScore: commitment.confidenceScore,
      createdAt: commitment.createdAt.toISOString(),
      updatedAt: commitment.updatedAt.toISOString(),
      latestActivity: latestActivity ?? null,
    };
  }

  static toDetailDto(
    commitment: CommitmentWithContext,
    latestActivity?: ActivitySummaryDto | null,
  ): CommitmentDetailResponseDto {
    return {
      ...CommitmentsMapper.toListDto(commitment, latestActivity),
      description: commitment.description ?? '',
      evidenceReference: commitment.evidenceReference,
      meetingSummary: commitment.meeting.summary,
      projectName: commitment.project.name,
      projectSummary: commitment.project.description,
      evidenceCount: commitment._count.evidence,
    };
  }
}
