import { ActivitySummaryDto } from '../projects/dto/project-response.dto';

/** Full JSON contract for a meeting attachment (metadata only — no URLs). */
export class MeetingAttachmentResponseDto {
  id!: string;
  meetingId!: string;
  fileName!: string;
  fileType!: string;
  storagePath!: string;
  fileSize!: number;
  uploadedAt!: string;
  createdAt!: string;
  updatedAt!: string;
  latestActivity!: ActivitySummaryDto | null;
}
