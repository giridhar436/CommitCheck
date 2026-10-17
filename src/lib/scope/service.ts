import { UserRepository } from "../auth/types";
import { MeetingRepository } from "../meetings/types";
import { ProjectRepository } from "../projects/types";
import {
  ExtractedTask,
  LLMExtractionService,
  TaskDraft,
  TaskDraftRepository,
  TaskDraftStatus,
} from "./types";

export async function triggerScopeExtraction(
  meetingId: string,
  freelancerId: string,
  userRepo: UserRepository,
  meetingRepo: MeetingRepository,
  projectRepo: ProjectRepository,
  draftRepo: TaskDraftRepository,
  extractionService: LLMExtractionService
): Promise<TaskDraft[]> {
  // 1. Verify user role
  const user = await userRepo.findById(freelancerId);
  if (!user || user.role !== "FREELANCER") {
    throw new Error("Only users with the FREELANCER role can extract scope.");
  }

  // 2. Verify meeting and transcript availability
  const meeting = await meetingRepo.findMeetingById(meetingId);
  if (!meeting) {
    throw new Error("Meeting record not found.");
  }
  if (!meeting.transcript) {
    throw new Error("Cannot extract scope: Meeting has no transcript yet.");
  }

  // 3. Verify project ownership
  const project = await projectRepo.findProjectById(meeting.projectId);
  if (!project || project.freelancerId !== freelancerId) {
    throw new Error("Unauthorized: You do not own this project.");
  }

  // 4. Run LLM extraction
  const extractedTasks = await extractionService.extractTasksFromTranscript(meeting.transcript);
  if (!extractedTasks || extractedTasks.length === 0) {
    throw new Error("No actionable deliverables were identified from the transcript.");
  }

  // 5. Persist extracted tasks as drafts
  return draftRepo.createTaskDraftsBatch(meetingId, meeting.projectId, extractedTasks);
}

export async function updateDraftTask(
  draftId: string,
  updates: Partial<Pick<TaskDraft, "title" | "description" | "priority" | "estimate" | "status">>,
  draftRepo: TaskDraftRepository
): Promise<TaskDraft> {
  const existing = await draftRepo.findDraftById(draftId);
  if (!existing) {
    throw new Error("Draft task not found.");
  }
  return draftRepo.updateTaskDraft(draftId, updates);
}

export async function createManualDraftTask(
  meetingId: string,
  projectId: string | null,
  task: ExtractedTask,
  draftRepo: TaskDraftRepository
): Promise<TaskDraft> {
  const title = task.title?.trim();
  if (!title) {
    throw new Error("Task title is required.");
  }

  return draftRepo.createTaskDraft({
    meetingId,
    projectId,
    title,
    description: task.description || "",
    priority: task.priority ?? 0,
    estimate: task.estimate ?? null,
    status: "DRAFT",
  });
}

export async function deleteDraftTask(
  draftId: string,
  draftRepo: TaskDraftRepository
): Promise<void> {
  const existing = await draftRepo.findDraftById(draftId);
  if (!existing) {
    throw new Error("Draft task not found.");
  }
  await draftRepo.deleteTaskDraft(draftId);
}

export async function approveAllDraftTasks(
  meetingId: string,
  draftRepo: TaskDraftRepository
): Promise<TaskDraft[]> {
  const drafts = await draftRepo.listDraftsForMeeting(meetingId);
  const approved: TaskDraft[] = [];

  for (const draft of drafts) {
    if (draft.status === "DRAFT") {
      const updated = await draftRepo.updateTaskDraft(draft.id, { status: "APPROVED" });
      approved.push(updated);
    } else {
      approved.push(draft);
    }
  }

  return approved;
}
