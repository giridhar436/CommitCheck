import { MeetingAnalysisStatus } from '@prisma/client';
import { CommitmentResponseDto } from '../../commitments/dto/commitment-response.dto';

/** Data contract of the manual analysis trigger (POST …/meetings/:id/analyze). */
export class MeetingAnalysisResponseDto {
  projectId!: string;
  meetingId!: string;
  /** Always COMPLETED on success — failures return the error envelope instead. */
  analysisStatus!: MeetingAnalysisStatus;
  commitmentsCreated!: number;
  evidenceCreated!: number;
  /** The commitments created by this analysis (Phase 6 list contract). */
  commitments!: CommitmentResponseDto[];
}
