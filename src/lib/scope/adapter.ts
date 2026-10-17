import { prisma } from "../prisma";
import { ExtractedTask, TaskDraft, TaskDraftRepository, TaskDraftStatus } from "./types";

export class PrismaTaskDraftRepository implements TaskDraftRepository {
  async createTaskDraft(data: {
    meetingId: string;
    projectId?: string | null;
    title: string;
    description: string;
    priority?: number;
    estimate?: number | null;
    status?: TaskDraftStatus;
  }): Promise<TaskDraft> {
    const raw = await prisma.linearTaskDraft.create({
      data: {
        meetingId: data.meetingId,
        projectId: data.projectId ?? null,
        title: data.title,
        description: data.description,
        priority: data.priority ?? 0,
        estimate: data.estimate ?? null,
        status: data.status ?? "DRAFT",
      },
    });
    return this.mapToTaskDraft(raw);
  }

  async createTaskDraftsBatch(
    meetingId: string,
    projectId: string | null,
    tasks: ExtractedTask[]
  ): Promise<TaskDraft[]> {
    const drafts: TaskDraft[] = [];
    for (const task of tasks) {
      const created = await this.createTaskDraft({
        meetingId,
        projectId,
        title: task.title,
        description: task.description,
        priority: task.priority ?? 0,
        estimate: task.estimate ?? null,
        status: "DRAFT",
      });
      drafts.push(created);
    }
    return drafts;
  }

  async listDraftsForMeeting(meetingId: string): Promise<TaskDraft[]> {
    const records = await prisma.linearTaskDraft.findMany({
      where: { meetingId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(this.mapToTaskDraft);
  }

  async listDraftsForProject(projectId: string): Promise<TaskDraft[]> {
    const records = await prisma.linearTaskDraft.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(this.mapToTaskDraft);
  }

  async findDraftById(id: string): Promise<TaskDraft | null> {
    const raw = await prisma.linearTaskDraft.findUnique({
      where: { id },
    });
    return raw ? this.mapToTaskDraft(raw) : null;
  }

  async updateTaskDraft(
    id: string,
    updates: Partial<Pick<TaskDraft, "title" | "description" | "priority" | "estimate" | "status">>
  ): Promise<TaskDraft> {
    const raw = await prisma.linearTaskDraft.update({
      where: { id },
      data: updates,
    });
    return this.mapToTaskDraft(raw);
  }

  async deleteTaskDraft(id: string): Promise<void> {
    await prisma.linearTaskDraft.delete({
      where: { id },
    });
  }

  private mapToTaskDraft(raw: any): TaskDraft {
    return {
      id: raw.id,
      meetingId: raw.meetingId,
      projectId: raw.projectId,
      title: raw.title,
      description: raw.description,
      priority: raw.priority ?? 0,
      estimate: raw.estimate,
      status: raw.status as TaskDraftStatus,
      linearIssueId: raw.linearIssueId ?? null,
      linearIssueKey: raw.linearIssueKey ?? null,
      linearIssueUrl: raw.linearIssueUrl ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}

export class InMemoryTaskDraftRepository implements TaskDraftRepository {
  private drafts: Map<string, TaskDraft> = new Map();

  async createTaskDraft(data: {
    meetingId: string;
    projectId?: string | null;
    title: string;
    description: string;
    priority?: number;
    estimate?: number | null;
    status?: TaskDraftStatus;
  }): Promise<TaskDraft> {
    const id = `draft_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date();
    const draft: TaskDraft = {
      id,
      meetingId: data.meetingId,
      projectId: data.projectId ?? null,
      title: data.title,
      description: data.description,
      priority: data.priority ?? 0,
      estimate: data.estimate ?? null,
      status: data.status ?? "DRAFT",
      linearIssueId: null,
      linearIssueKey: null,
      linearIssueUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    this.drafts.set(id, draft);
    return { ...draft };
  }

  async createTaskDraftsBatch(
    meetingId: string,
    projectId: string | null,
    tasks: ExtractedTask[]
  ): Promise<TaskDraft[]> {
    const drafts: TaskDraft[] = [];
    for (const t of tasks) {
      const d = await this.createTaskDraft({
        meetingId,
        projectId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        estimate: t.estimate,
        status: "DRAFT",
      });
      drafts.push(d);
    }
    return drafts;
  }

  async listDraftsForMeeting(meetingId: string): Promise<TaskDraft[]> {
    const list: TaskDraft[] = [];
    for (const d of this.drafts.values()) {
      if (d.meetingId === meetingId) list.push({ ...d });
    }
    return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listDraftsForProject(projectId: string): Promise<TaskDraft[]> {
    const list: TaskDraft[] = [];
    for (const d of this.drafts.values()) {
      if (d.projectId === projectId) list.push({ ...d });
    }
    return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findDraftById(id: string): Promise<TaskDraft | null> {
    const draft = this.drafts.get(id);
    return draft ? { ...draft } : null;
  }

  async updateTaskDraft(
    id: string,
    updates: Partial<Pick<TaskDraft, "title" | "description" | "priority" | "estimate" | "status">>
  ): Promise<TaskDraft> {
    const existing = this.drafts.get(id);
    if (!existing) throw new Error("Task draft not found");

    const updated: TaskDraft = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.drafts.set(id, updated);
    return { ...updated };
  }

  async deleteTaskDraft(id: string): Promise<void> {
    this.drafts.delete(id);
  }

  clear() {
    this.drafts.clear();
  }
}

export const defaultTaskDraftRepository = new PrismaTaskDraftRepository();
