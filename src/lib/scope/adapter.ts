import { prisma } from "../prisma";
import {
  ClassifiedScopeItem,
  ClientApprovalStatus,
  ExtractedTask,
  RequirementClassification,
  TaskDraft,
  TaskDraftRepository,
  TaskDraftStatus,
} from "./types";

export class PrismaTaskDraftRepository implements TaskDraftRepository {
  async createTaskDraft(data: {
    meetingId: string;
    projectId?: string | null;
    title: string;
    description: string;
    priority?: number;
    estimate?: number | null;
    status?: TaskDraftStatus;
    classification?: RequirementClassification;
    clientApprovalStatus?: ClientApprovalStatus;
    evidence?: string | null;
    confidence?: number | null;
    suggestedMilestone?: string | null;
  }): Promise<TaskDraft> {
    const raw = await (prisma.linearTaskDraft.create as any)({
      data: {
        meetingId: data.meetingId,
        projectId: data.projectId ?? null,
        title: data.title,
        description: data.description,
        priority: data.priority ?? 0,
        estimate: data.estimate ?? null,
        status: data.status ?? "DRAFT",
        classification: (data.classification as any) ?? "EXPLICIT",
        clientApprovalStatus: (data.clientApprovalStatus as any) ?? "NOT_REQUIRED",
        evidence: data.evidence ?? null,
        confidence: data.confidence ?? null,
        suggestedMilestone: data.suggestedMilestone ?? null,
      },
    });
    return this.mapToTaskDraft(raw);
  }

  async createTaskDraftsBatch(
    meetingId: string,
    projectId: string | null,
    tasks: ClassifiedScopeItem[] | ExtractedTask[]
  ): Promise<TaskDraft[]> {
    const drafts: TaskDraft[] = [];
    for (const task of tasks) {
      const classification: RequirementClassification =
        (task as ClassifiedScopeItem).classification ?? "EXPLICIT";

      const clientApprovalStatus: ClientApprovalStatus =
        classification === "EXPLICIT" || classification === "CONFIRMED_COMMITMENT"
          ? "NOT_REQUIRED"
          : "PENDING_CLIENT_APPROVAL";

      const created = await this.createTaskDraft({
        meetingId,
        projectId,
        title: task.title,
        description: task.description,
        priority: task.priority ?? 0,
        estimate: task.estimate ?? null,
        status: "DRAFT",
        classification,
        clientApprovalStatus,
        evidence: task.evidence ?? null,
        confidence: task.confidence ?? null,
        suggestedMilestone: task.suggestedMilestone ?? null,
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
    updates: Partial<
      Pick<
        TaskDraft,
        | "title"
        | "description"
        | "priority"
        | "estimate"
        | "status"
        | "classification"
        | "clientApprovalStatus"
        | "evidence"
        | "confidence"
        | "suggestedMilestone"
        | "linearIssueId"
        | "linearIssueKey"
        | "linearIssueUrl"
      >
    >
  ): Promise<TaskDraft> {
    const raw = await prisma.linearTaskDraft.update({
      where: { id },
      data: updates as any,
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
      classification: (raw.classification as RequirementClassification) || "EXPLICIT",
      clientApprovalStatus:
        (raw.clientApprovalStatus as ClientApprovalStatus) || "NOT_REQUIRED",
      evidence: raw.evidence ?? null,
      confidence: raw.confidence ?? null,
      suggestedMilestone: raw.suggestedMilestone ?? null,
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
    classification?: RequirementClassification;
    clientApprovalStatus?: ClientApprovalStatus;
    evidence?: string | null;
    confidence?: number | null;
    suggestedMilestone?: string | null;
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
      classification: data.classification ?? "EXPLICIT",
      clientApprovalStatus: data.clientApprovalStatus ?? "NOT_REQUIRED",
      evidence: data.evidence ?? null,
      confidence: data.confidence ?? null,
      suggestedMilestone: data.suggestedMilestone ?? null,
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
    tasks: ClassifiedScopeItem[] | ExtractedTask[]
  ): Promise<TaskDraft[]> {
    const results: TaskDraft[] = [];
    for (const task of tasks) {
      const classification: RequirementClassification =
        (task as ClassifiedScopeItem).classification ?? "EXPLICIT";

      const clientApprovalStatus: ClientApprovalStatus =
        classification === "EXPLICIT" || classification === "CONFIRMED_COMMITMENT"
          ? "NOT_REQUIRED"
          : "PENDING_CLIENT_APPROVAL";

      const draft = await this.createTaskDraft({
        meetingId,
        projectId,
        title: task.title,
        description: task.description,
        priority: task.priority ?? 0,
        estimate: task.estimate ?? null,
        status: "DRAFT",
        classification,
        clientApprovalStatus,
        evidence: task.evidence ?? null,
        confidence: task.confidence ?? null,
        suggestedMilestone: task.suggestedMilestone ?? null,
      });
      results.push(draft);
    }
    return results;
  }

  async listDraftsForMeeting(meetingId: string): Promise<TaskDraft[]> {
    return Array.from(this.drafts.values())
      .filter((d) => d.meetingId === meetingId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listDraftsForProject(projectId: string): Promise<TaskDraft[]> {
    return Array.from(this.drafts.values())
      .filter((d) => d.projectId === projectId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findDraftById(id: string): Promise<TaskDraft | null> {
    const draft = this.drafts.get(id);
    return draft ? { ...draft } : null;
  }

  async updateTaskDraft(
    id: string,
    updates: Partial<
      Pick<
        TaskDraft,
        | "title"
        | "description"
        | "priority"
        | "estimate"
        | "status"
        | "classification"
        | "clientApprovalStatus"
        | "evidence"
        | "confidence"
        | "suggestedMilestone"
        | "linearIssueId"
        | "linearIssueKey"
        | "linearIssueUrl"
      >
    >
  ): Promise<TaskDraft> {
    const existing = this.drafts.get(id);
    if (!existing) throw new Error("Draft task not found");

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
