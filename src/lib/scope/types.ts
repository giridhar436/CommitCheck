export type TaskDraftStatus = "DRAFT" | "APPROVED" | "DISCARDED" | "SYNCED";

export type RequirementClassification =
  | "EXPLICIT"
  | "AI_INFERRED"
  | "TENTATIVE"
  | "CONFIRMED_COMMITMENT";

export type ClientApprovalStatus =
  | "NOT_REQUIRED"
  | "PENDING_CLIENT_APPROVAL"
  | "CLIENT_APPROVED"
  | "CLIENT_REJECTED";

export interface ClassifiedScopeItem {
  title: string;
  description: string;
  classification: RequirementClassification;
  priority: number; // 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
  estimate?: number | null;
  evidence?: string;
  confidence?: number; // 0.0 - 1.0
  suggestedMilestone?: string;
  notes?: string;
}

export interface ComprehensiveScopeAnalysis {
  explicitRequirements: ClassifiedScopeItem[];
  aiInferredRequirements: ClassifiedScopeItem[];
  tentativeRequirements: ClassifiedScopeItem[];
  confirmedCommitments: ClassifiedScopeItem[];
  summary: string;
}

export interface ExtractedTask {
  title: string;
  description: string;
  priority: number;
  estimate?: number | null;
  suggestedMilestone?: string;
  classification?: RequirementClassification;
  evidence?: string;
  confidence?: number;
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
  classification: RequirementClassification;
  clientApprovalStatus: ClientApprovalStatus;
  evidence?: string | null;
  confidence?: number | null;
  suggestedMilestone?: string | null;
  linearIssueId?: string | null;
  linearIssueKey?: string | null;
  linearIssueUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMExtractionService {
  analyzeTranscript(transcript: string): Promise<ComprehensiveScopeAnalysis>;
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
    classification?: RequirementClassification;
    clientApprovalStatus?: ClientApprovalStatus;
    evidence?: string | null;
    confidence?: number | null;
    suggestedMilestone?: string | null;
  }): Promise<TaskDraft>;
  createTaskDraftsBatch(
    meetingId: string,
    projectId: string | null,
    tasks: ClassifiedScopeItem[] | ExtractedTask[]
  ): Promise<TaskDraft[]>;
  listDraftsForMeeting(meetingId: string): Promise<TaskDraft[]>;
  listDraftsForProject(projectId: string): Promise<TaskDraft[]>;
  findDraftById(id: string): Promise<TaskDraft | null>;
  updateTaskDraft(
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
  ): Promise<TaskDraft>;
  deleteTaskDraft(id: string): Promise<void>;
}
