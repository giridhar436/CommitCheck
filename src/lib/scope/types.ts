export type TaskDraftStatus = "DRAFT" | "APPROVED" | "DISCARDED" | "SYNCED";

export interface ExtractedTask {
  title: string;
  description: string;
  priority: number; // 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
  estimate?: number | null;
  suggestedMilestone?: string;
}

export interface TaskDraft {
  id: string;
  meetingId: string;
  projectId: string | null;
  title: string;
  description: string;
  priority: number;
  estimate: number | null;
  status: TaskDraftStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMExtractionService {
  extractTasksFromTranscript(transcript: string): Promise<ExtractedTask[]>;
}

export interface TaskDraftRepository {
  createTaskDraft(data: {
    meetingId: string;
    projectId?: string | null;
    title: string;
    description: string;
    priority?: number;
    estimate?: number | null;
    status?: TaskDraftStatus;
  }): Promise<TaskDraft>;
  createTaskDraftsBatch(
    meetingId: string,
    projectId: string | null,
    tasks: ExtractedTask[]
  ): Promise<TaskDraft[]>;
  listDraftsForMeeting(meetingId: string): Promise<TaskDraft[]>;
  listDraftsForProject(projectId: string): Promise<TaskDraft[]>;
  findDraftById(id: string): Promise<TaskDraft | null>;
  updateTaskDraft(
    id: string,
    updates: Partial<Pick<TaskDraft, "title" | "description" | "priority" | "estimate" | "status">>
  ): Promise<TaskDraft>;
  deleteTaskDraft(id: string): Promise<void>;
}
