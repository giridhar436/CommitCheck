import { MeetingAttachment } from '@prisma/client';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';
import { MeetingAttachmentResponseDto } from './dto/meeting-attachment-response.dto';

/** Maps a Prisma row to the API's JSON contract (dates → ISO strings). */
export class MeetingAttachmentsMapper {
  static toResponseDto(
    attachment: MeetingAttachment,
    latestActivity?: ActivitySummaryDto | null,
  ): MeetingAttachmentResponseDto {
    return {
      id: attachment.id,
      meetingId: attachment.meetingId,
      fileName: attachment.fileName,
      fileType: attachment.fileType ?? '',
      storagePath: attachment.storagePath,
      fileSize: attachment.fileSize ?? 0,
      uploadedAt: attachment.uploadedAt.toISOString(),
      createdAt: attachment.createdAt.toISOString(),
      updatedAt: attachment.updatedAt.toISOString(),
      latestActivity: latestActivity ?? null,
    };
  }
}
