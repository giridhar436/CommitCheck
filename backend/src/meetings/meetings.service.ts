import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityAction,
  ActivityEntityType,
  MeetingAnalysisStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { GetMeetingsQueryDto } from './dto/get-meetings-query.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingDetailResponseDto, MeetingResponseDto } from './dto/meeting-response.dto';
import { Paginated } from '../common/api-response';
import { MeetingsMapper } from './meetings.mapper';
import { ActivitySummaryDto } from '../projects/dto/project-response.dto';

const MEETING_COUNT_INCLUDE = {
  _count: { select: { commitments: true, attachments: true } },
} satisfies Prisma.MeetingInclude;

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated list: search (title/summary), status filter, meetingDate range, sorting. */
  async findAll(
    projectId: string,
    query: GetMeetingsQueryDto,
  ): Promise<Paginated<MeetingResponseDto>> {
    await this.assertProjectExists(projectId);

    const { page, limit, search, analysisStatus, meetingDateFrom, meetingDateTo, sortBy, sortOrder, skip } =
      query;

    const where: Prisma.MeetingWhereInput = {
      projectId,
      ...(analysisStatus ? { analysisStatus } : {}),
      ...(meetingDateFrom || meetingDateTo
        ? {
            meetingDate: {
              ...(meetingDateFrom && { gte: new Date(meetingDateFrom) }),
              ...(meetingDateTo && { lte: new Date(meetingDateTo) }),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { summary: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const meetings = await this.prisma.meeting.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: MEETING_COUNT_INCLUDE,
    });
    const totalItems = await this.prisma.meeting.count({ where });

    // One batched lookup for the page's latest activities (avoids N+1).
    const meetingIds = meetings.map((m) => m.id);
    const activities = await this.prisma.activity.findMany({
      where: { projectId, entityType: ActivityEntityType.MEETING, entityId: { in: meetingIds } },
      orderBy: { createdAt: 'desc' },
    });
    const latestByMeeting = new Map<string, ActivitySummaryDto>();
    for (const activity of activities) {
      if (activity.entityId && !latestByMeeting.has(activity.entityId)) {
        latestByMeeting.set(activity.entityId, this.toActivitySummary(activity));
      }
    }

    return {
      items: meetings.map((meeting) =>
        MeetingsMapper.toResponseDto(meeting, latestByMeeting.get(meeting.id) ?? null),
      ),
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  /** Meeting detail: full row + attachments + commitment count + latest activity. */
  async findOne(projectId: string, id: string): Promise<MeetingDetailResponseDto> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, projectId },
      include: {
        ...MEETING_COUNT_INCLUDE,
        attachments: { orderBy: { uploadedAt: 'desc' } },
      },
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with id ${id} not found`);
    }
    return MeetingsMapper.toDetailDto(
      meeting,
      await this.latestActivityOf(projectId, id),
    );
  }

  /** Creates the meeting (analysisStatus defaults to NOT_STARTED) + audit entry. */
  async create(projectId: string, dto: CreateMeetingDto): Promise<MeetingResponseDto> {
    await this.assertProjectExists(projectId);

    const meeting = await this.prisma.$transaction(async (tx) => {
      const created = await tx.meeting.create({
        data: {
          projectId,
          title: dto.title,
          summary: dto.summary,
          meetingDate: new Date(dto.meetingDate),
          analysisStatus: dto.analysisStatus ?? MeetingAnalysisStatus.NOT_STARTED,
        },
        include: MEETING_COUNT_INCLUDE,
      });

      await tx.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEETING_CREATED,
          entityType: ActivityEntityType.MEETING,
          entityId: created.id,
          description: `Meeting "${created.title}" created`,
        },
      });

      return created;
    });

    return MeetingsMapper.toResponseDto(meeting);
  }

  /** Partial update of title/summary/meetingDate/analysisStatus + audit entry. */
  async update(
    projectId: string,
    id: string,
    dto: UpdateMeetingDto,
  ): Promise<MeetingResponseDto> {
    const existing = await this.prisma.meeting.findFirst({
      where: { id, projectId },
      select: { id: true, title: true },
    });
    if (!existing) {
      throw new NotFoundException(`Meeting with id ${id} not found`);
    }

    const data: Prisma.MeetingUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.summary !== undefined && { summary: dto.summary }),
      ...(dto.meetingDate !== undefined && { meetingDate: new Date(dto.meetingDate) }),
      ...(dto.analysisStatus !== undefined && { analysisStatus: dto.analysisStatus }),
    };

    const [meeting] = await this.prisma.$transaction([
      this.prisma.meeting.update({
        where: { id },
        data,
        include: MEETING_COUNT_INCLUDE,
      }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEETING_UPDATED,
          entityType: ActivityEntityType.MEETING,
          entityId: id,
          description: `Meeting "${dto.title ?? existing.title}" updated (${Object.keys(dto).join(', ')})`,
        },
      }),
    ]);

    return MeetingsMapper.toResponseDto(meeting);
  }

  /**
   * Deletes the meeting. Unlike project deletion this audit entry survives:
   * it points at the still-existing project, while the schema cascade removes
   * the meeting's attachments, commitments and commitment evidence.
   */
  async remove(projectId: string, id: string): Promise<{ id: string; title: string }> {
    const existing = await this.prisma.meeting.findFirst({
      where: { id, projectId },
      select: { id: true, title: true },
    });
    if (!existing) {
      throw new NotFoundException(`Meeting with id ${id} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.meeting.delete({ where: { id } }),
      this.prisma.activity.create({
        data: {
          projectId,
          action: ActivityAction.MEETING_DELETED,
          entityType: ActivityEntityType.MEETING,
          entityId: existing.id,
          description: `Meeting "${existing.title}" deleted`,
        },
      }),
    ]);

    return existing;
  }

  // ——— helpers ———

  private async assertProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }

  /**
   * Latest MEETING-scoped activity entry for one meeting. Activities are
   * project-scoped with a polymorphic entityId (no relation), so this is a
   * targeted query rather than an include.
   */
  private async latestActivityOf(
    projectId: string,
    meetingId: string,
  ): Promise<ActivitySummaryDto | null> {
    const activity = await this.prisma.activity.findFirst({
      where: { projectId, entityType: ActivityEntityType.MEETING, entityId: meetingId },
      orderBy: { createdAt: 'desc' },
    });
    return activity ? this.toActivitySummary(activity) : null;
  }

  private toActivitySummary(activity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    description: string;
    createdAt: Date;
  }): ActivitySummaryDto {
    return {
      id: activity.id,
      action: activity.action as ActivitySummaryDto['action'],
      entityType: activity.entityType as ActivitySummaryDto['entityType'],
      entityId: activity.entityId,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    };
  }
}
