import { Meeting, MeetingAttachment } from '@prisma/client';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';
import { AttachmentSummaryDto, MeetingDetailResponseDto, MeetingResponseDto } from './dto/meeting-response.dto';

type MeetingWithCounts = Meeting & {
  _count: { commitments: number; attachments: number };
};

type MeetingWithRelations = MeetingWithCounts & {
  attachments: MeetingAttachment[];
};

/**
 * Maps Prisma rows to the API's JSON contract:
 * dates → ISO strings, relations → counts, polymorphic activity → summary.
 */
export class MeetingsMapper {
  static toAttachmentSummary(attachment: MeetingAttachment): AttachmentSummaryDto {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      storagePath: attachment.storagePath,
      fileSize: attachment.fileSize,
      uploadedAt: attachment.uploadedAt.toISOString(),
    };
  }

  static toResponseDto(
    meeting: MeetingWithCounts,
    latestActivity?: ActivitySummaryDto | null,
  ): MeetingResponseDto {
    return {
      id: meeting.id,
      projectId: meeting.projectId,
      title: meeting.title,
      summary: meeting.summary,
      meetingDate: meeting.meetingDate.toISOString(),
      analysisStatus: meeting.analysisStatus,
      commitmentCount: meeting._count.commitments,
      attachmentCount: meeting._count.attachments,
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
      latestActivity: latestActivity ?? null,
    };
  }

  static toDetailDto(
    meeting: MeetingWithRelations,
    latestActivity?: ActivitySummaryDto | null,
  ): MeetingDetailResponseDto {
    return {
      ...MeetingsMapper.toResponseDto(meeting, latestActivity),
      attachments: meeting.attachments.map(MeetingsMapper.toAttachmentSummary),
    };
  }
}
