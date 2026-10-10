import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  Activity,
  MeetingAttachment,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingAttachmentDto } from './dto/create-meeting-attachment.dto';
import { GetMeetingAttachmentsQueryDto } from './dto/get-meeting-attachments-query.dto';
import { UpdateMeetingAttachmentDto } from './dto/update-meeting-attachment.dto';
import { MeetingAttachmentResponseDto } from './dto/meeting-attachment-response.dto';
import { Paginated } from '../common/api-response';
import { MeetingAttachmentsMapper } from './meeting-attachments.mapper';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';

@Injectable()
export class MeetingAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated list for one meeting: fileName search + sorting. */
  async findAll(
    projectId: string,
    meetingId: string,
    query: GetMeetingAttachmentsQueryDto,
  ): Promise<Paginated<MeetingAttachmentResponseDto>> {
    await this.assertProjectExists(projectId);
    await this.assertMeetingInProject(projectId, meetingId);

    const { page, limit, search, sortBy, sortOrder, skip } = query;

    const where: Prisma.MeetingAttachmentWhereInput = {
      meetingId,
      ...(search
        ? { fileName: { contains: search, mode: 'insensitive' } }
        : {}),
    };

    const attachments = await this.prisma.meetingAttachment.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });
    const totalItems = await this.prisma.meetingAttachment.count({ where });

    // One batched lookup for the page's latest activities (avoids N+1).
    const attachmentIds = attachments.map((a) => a.id);
    const activities = await this.prisma.activity.findMany({
      where: {
        projectId,
        entityType: ActivityEntityType.MEETING_ATTACHMENT,
        entityId: { in: attachmentIds },
      },
      orderBy: { createdAt: 'desc' },
    });
    const latestByAttachment = new Map<string, ActivitySummaryDto>();
    for (const activity of activities) {
      if (activity.entityId && !latestByAttachment.has(activity.entityId)) {
        latestByAttachment.set(activity.entityId, this.toActivitySummary(activity));
      }
    }

    return {
      items: attachments.map((attachment) =>
        MeetingAttachmentsMapper.toResponseDto(
          attachment,
          latestByAttachment.get(attachment.id) ?? null,
        ),
      ),
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  /** Attachment metadata only — no storage access, no signed URLs. */
  async findOne(
    projectId: string,
    meetingId: string,
    id: string,
  ): Promise<MeetingAttachmentResponseDto> {
    const attachment = await this.findAttachmentInMeeting(meetingId, id);
    return MeetingAttachmentsMapper.toResponseDto(
      attachment,
      await this.latestActivityOf(projectId, id),
    );
  }

  /** Creates the metadata row (uploadedAt defaults to now()) + audit entry. */
  async create(
    projectId: string,
    meetingId: string,
    dto: CreateMeetingAttachmentDto,
  ): Promise<MeetingAttachmentResponseDto> {
    await this.assertProjectExists(projectId);
    await this.assertMeetingInProject(projectId, meetingId);

    const attachment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.meetingAttachment.create({
        data: {
          meetingId,
          fileName: dto.fileName,
          fileType: dto.fileType,
          storagePath: dto.storagePath,
          fileSize: dto.fileSize,
          ...(dto.uploadedAt !== undefined && { uploadedAt: new Date(dto.uploadedAt) }),
        },
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEETING_ATTACHMENT_CREATED,
          entityType: ActivityEntityType.MEETING_ATTACHMENT,
          entityId: created.id,
          description: `Attachment "${created.fileName}" added to meeting`,
        },
      });

      return created;
    });

    return MeetingAttachmentsMapper.toResponseDto(attachment);
  }

  /** Partial update of the four editable metadata fields + audit entry. */
  async update(
    projectId: string,
    meetingId: string,
    id: string,
    dto: UpdateMeetingAttachmentDto,
  ): Promise<MeetingAttachmentResponseDto> {
    const existing = await this.findAttachmentInMeeting(meetingId, id);

    const data: Prisma.MeetingAttachmentUpdateInput = {
      ...(dto.fileName !== undefined && { fileName: dto.fileName }),
      ...(dto.fileType !== undefined && { fileType: dto.fileType }),
      ...(dto.storagePath !== undefined && { storagePath: dto.storagePath }),
      ...(dto.fileSize !== undefined && { fileSize: dto.fileSize }),
    };

    const [attachment] = await this.prisma.$transaction([
      this.prisma.meetingAttachment.update({
        where: { id },
        data,
      }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEETING_ATTACHMENT_UPDATED,
          entityType: ActivityEntityType.MEETING_ATTACHMENT,
          entityId: id,
          description: `Attachment "${dto.fileName ?? existing.fileName}" updated (${Object.keys(dto).join(', ')})`,
        },
      }),
    ]);

    return MeetingAttachmentsMapper.toResponseDto(attachment);
  }

  /**
   * Deletes the metadata row and logs the deletion in one transaction.
   * No bucket interaction: the storage object is left untouched by design —
   * storage cleanup belongs to the Supabase Storage phase.
   */
  async remove(
    projectId: string,
    meetingId: string,
    id: string,
  ): Promise<MeetingAttachment> {
    const existing = await this.findAttachmentInMeeting(meetingId, id);

    await this.prisma.$transaction([
      this.prisma.meetingAttachment.delete({ where: { id } }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEETING_ATTACHMENT_DELETED,
          entityType: ActivityEntityType.MEETING_ATTACHMENT,
          entityId: existing.id,
          description: `Attachment "${existing.fileName}" removed from meeting`,
        },
      }),
    ]);

    return existing;
  }

  // ——— guards & helpers ———

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }

  /** One lookup covers both "meeting exists" and "meeting belongs to project". */
  private async assertMeetingInProject(
    projectId: string,
    meetingId: string,
  ): Promise<void> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, projectId },
      select: { id: true },
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${meetingId} not found`);
    }
  }

  /** Attachment must exist AND belong to the (already validated) meeting. */
  private async findAttachmentInMeeting(
    meetingId: string,
    id: string,
  ): Promise<MeetingAttachment> {
    const attachment = await this.prisma.meetingAttachment.findFirst({
      where: { id, meetingId },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment with id ${id} not found`);
    }
    return attachment;
  }

  private async latestActivityOf(
    projectId: string,
    attachmentId: string,
  ): Promise<ActivitySummaryDto | null> {
    const activity = await this.prisma.activity.findFirst({
      where: { projectId, entityType: ActivityEntityType.MEETING_ATTACHMENT, entityId: attachmentId },
      orderBy: { createdAt: 'desc' },
    });
    return activity ? this.toActivitySummary(activity) : null;
  }

  private toActivitySummary(activity: Activity): ActivitySummaryDto {
    return {
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    };
  }
}
