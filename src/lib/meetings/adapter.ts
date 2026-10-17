import { prisma } from "../prisma";
import { Meeting, MeetingRepository, MeetingStatus } from "./types";

export class PrismaMeetingRepository implements MeetingRepository {
  async createMeeting(
    projectId: string,
    meetUrl: string,
    recallBotId?: string | null,
    status: MeetingStatus = "SCHEDULED"
  ): Promise<Meeting> {
    const raw = await prisma.meeting.create({
      data: {
        projectId,
        meetUrl,
        botId: recallBotId ?? null,
        recallBotId: recallBotId ?? null,
        status,
      },
    });
    return this.mapToMeeting(raw);
  }

  async findMeetingById(id: string): Promise<Meeting | null> {
    const raw = await prisma.meeting.findUnique({
      where: { id },
    });
    return raw ? this.mapToMeeting(raw) : null;
  }

  async findMeetingByRecallBotId(recallBotId: string): Promise<Meeting | null> {
    const raw = await prisma.meeting.findFirst({
      where: {
        OR: [{ recallBotId }, { botId: recallBotId }],
      },
    });
    return raw ? this.mapToMeeting(raw) : null;
  }

  async listMeetingsForProject(projectId: string): Promise<Meeting[]> {
    const records = await prisma.meeting.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(this.mapToMeeting);
  }

  async updateMeetingStatus(
    meetingId: string,
    status: MeetingStatus,
    transcript?: string | null,
    transcriptJson?: string | null
  ): Promise<Meeting> {
    const data: any = { status };
    if (transcript !== undefined) data.transcript = transcript;
    if (transcriptJson !== undefined) data.transcriptJson = transcriptJson;

    const raw = await prisma.meeting.update({
      where: { id: meetingId },
      data,
    });
    return this.mapToMeeting(raw);
  }

  private mapToMeeting(raw: any): Meeting {
    return {
      id: raw.id,
      projectId: raw.projectId,
      meetUrl: raw.meetUrl,
      recallBotId: raw.recallBotId || raw.botId,
      status: raw.status as MeetingStatus,
      transcript: raw.transcript,
      transcriptJson: raw.transcriptJson,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}

export class InMemoryMeetingRepository implements MeetingRepository {
  private meetings: Map<string, Meeting> = new Map();

  async createMeeting(
    projectId: string,
    meetUrl: string,
    recallBotId?: string | null,
    status: MeetingStatus = "SCHEDULED"
  ): Promise<Meeting> {
    const id = `meet_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date();
    const meeting: Meeting = {
      id,
      projectId,
      meetUrl,
      recallBotId: recallBotId ?? null,
      status,
      transcript: null,
      transcriptJson: null,
      createdAt: now,
      updatedAt: now,
    };
    this.meetings.set(id, meeting);
    return { ...meeting };
  }

  async findMeetingById(id: string): Promise<Meeting | null> {
    const meeting = this.meetings.get(id);
    return meeting ? { ...meeting } : null;
  }

  async findMeetingByRecallBotId(recallBotId: string): Promise<Meeting | null> {
    for (const m of this.meetings.values()) {
      if (m.recallBotId === recallBotId) return { ...m };
    }
    return null;
  }

  async listMeetingsForProject(projectId: string): Promise<Meeting[]> {
    const list: Meeting[] = [];
    for (const m of this.meetings.values()) {
      if (m.projectId === projectId) list.push({ ...m });
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateMeetingStatus(
    meetingId: string,
    status: MeetingStatus,
    transcript?: string | null,
    transcriptJson?: string | null
  ): Promise<Meeting> {
    const existing = this.meetings.get(meetingId);
    if (!existing) throw new Error("Meeting not found");

    const updated: Meeting = {
      ...existing,
      status,
      transcript: transcript !== undefined ? transcript : existing.transcript,
      transcriptJson: transcriptJson !== undefined ? transcriptJson : existing.transcriptJson,
      updatedAt: new Date(),
    };
    this.meetings.set(meetingId, updated);
    return { ...updated };
  }

  clear() {
    this.meetings.clear();
  }
}
