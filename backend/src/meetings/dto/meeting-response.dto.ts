import { MeetingAnalysisStatus, MeetingAttachment } from '@prisma/client';
import { ActivitySummaryDto } from '../../projects/dto/project-response.dto';

/** Attachment summary embedded in the meeting detail response. */
export class AttachmentSummaryDto {
  id!: string;
  fileName!: string;
  fileType!: string | null;
  storagePath!: string;
  fileSize!: number | null;
  uploadedAt!: string;
}

/** List-item contract for GET /projects/:projectId/meetings. */
export class MeetingResponseDto {
  id!: string;
  projectId!: string;
  title!: string;
  summary!: string | null;
  meetingDate!: string;
  analysisStatus!: MeetingAnalysisStatus;
  commitmentCount!: number;
  attachmentCount!: number;
  createdAt!: string;
  updatedAt!: string;
  latestActivity!: ActivitySummaryDto | null;
}

/** Detail contract — includes the attachment list; commitments are counts only. */
export class MeetingDetailResponseDto extends MeetingResponseDto {
  attachments!: AttachmentSummaryDto[];
}
