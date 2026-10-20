import { UserRepository } from "../auth/types";
import { MeetingRepository } from "../meetings/types";
import { ProjectRepository } from "../projects/types";
import { EmailNotificationService } from "../notifications/types";
import { LinearService } from "../linear/types";
import {
  ClassifiedScopeItem,
  ComprehensiveScopeAnalysis,
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

  // 4. Check if comprehensive analysis is already cached in database
  let analysis: ComprehensiveScopeAnalysis;
  if (meeting.analysisJson) {
    try {
      analysis = JSON.parse(meeting.analysisJson);
    } catch {
      analysis = await extractionService.analyzeTranscript(meeting.transcript);
      await meetingRepo.updateMeetingAnalysis(meetingId, JSON.stringify(analysis));
    }
  } else {
    analysis = await extractionService.analyzeTranscript(meeting.transcript);
    await meetingRepo.updateMeetingAnalysis(meetingId, JSON.stringify(analysis));
  }

  // 5. If drafts have already been generated for this meeting, return them
  const existingDrafts = await draftRepo.listDraftsForMeeting(meetingId);
  if (existingDrafts.length > 0) {
    return existingDrafts;
  }

  // 6. Combine classified items
  const allItems: ClassifiedScopeItem[] = [
    ...(analysis.explicitRequirements || []).map((i) => ({
      ...i,
      classification: "EXPLICIT" as const,
    })),
    ...(analysis.confirmedCommitments || []).map((i) => ({
      ...i,
      classification: "CONFIRMED_COMMITMENT" as const,
    })),
    ...(analysis.aiInferredRequirements || []).map((i) => ({
      ...i,
      classification: "AI_INFERRED" as const,
    })),
    ...(analysis.tentativeRequirements || []).map((i) => ({
      ...i,
      classification: "TENTATIVE" as const,
    })),
  ];

  if (allItems.length === 0) {
    throw new Error("No actionable deliverables were identified from the transcript.");
  }

  // 6. Persist classified items as drafts
  return draftRepo.createTaskDraftsBatch(meetingId, meeting.projectId, allItems);
}

export async function requestClientScopeConfirmation(
  projectId: string,
  freelancerId: string,
  userRepo: UserRepository,
  projectRepo: ProjectRepository,
  draftRepo: TaskDraftRepository,
  emailService: EmailNotificationService,
  appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
): Promise<{ requestedCount: number; emailSent: boolean; message: string }> {
  // 1. Verify user & project ownership
  const user = await userRepo.findById(freelancerId);
  if (!user || user.role !== "FREELANCER") {
    throw new Error("Only users with the FREELANCER role can request scope confirmation.");
  }

  const project = await projectRepo.findProjectById(projectId);
  if (!project || project.freelancerId !== freelancerId) {
    throw new Error("Unauthorized: You do not own this project.");
  }

  if (!project.clientEmail) {
    throw new Error("Project does not have a client email configured.");
  }

  // 2. Identify pending drafts that need client confirmation
  const drafts = await draftRepo.listDraftsForProject(projectId);
  const pendingItems = drafts.filter(
    (d) =>
      d.clientApprovalStatus === "PENDING_CLIENT_APPROVAL" &&
      d.status !== "DISCARDED" &&
      d.status !== "SYNCED"
  );

  if (pendingItems.length === 0) {
    return {
      requestedCount: 0,
      emailSent: false,
      message: "No pending tentative or AI-inferred requirements awaiting confirmation.",
    };
  }

  // 3. Dispatch confirmation email via Resend
  const confirmationUrl = `${appBaseUrl}/client/projects/${projectId}/scope-confirmation`;
  await emailService.sendScopeConfirmationEmail({
    to: project.clientEmail,
    projectName: project.title || project.name,
    confirmationUrl,
    items: pendingItems.map((item) => ({
      title: item.title,
      description: item.description,
      classification: item.classification,
      evidence: item.evidence || undefined,
      estimate: item.estimate,
    })),
  });

  return {
    requestedCount: pendingItems.length,
    emailSent: true,
    message: `Scope confirmation requested for ${pendingItems.length} items. Email sent to ${project.clientEmail}.`,
  };
}

export async function confirmClientScopeItems(
  projectId: string,
  clientId: string,
  decisions: Array<{ draftId: string; approved: boolean }>,
  userRepo: UserRepository,
  projectRepo: ProjectRepository,
  draftRepo: TaskDraftRepository,
  linearService?: LinearService
): Promise<{ updatedDrafts: TaskDraft[]; autoSyncedCount: number }> {
  // 1. Verify client role and project access
  const user = await userRepo.findById(clientId);
  if (!user || user.role !== "CLIENT") {
    throw new Error("Only users with the CLIENT role can confirm scope items.");
  }

  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const isClient =
    project.clientId === user.id ||
    (project.clientEmail && project.clientEmail.toLowerCase() === user.email.toLowerCase());

  if (!isClient) {
    throw new Error("Unauthorized: You do not have permission to confirm scope for this project.");
  }

  // 2. Determine if the project is already published to Linear
  const freelancer = await userRepo.findById(project.freelancerId);
  const canAutoSync =
    Boolean(project.linearProjectId) &&
    Boolean(freelancer?.linearAccessToken) &&
    Boolean(linearService);

  const updatedDrafts: TaskDraft[] = [];
  let autoSyncedCount = 0;

  for (const decision of decisions) {
    const draft = await draftRepo.findDraftById(decision.draftId);
    if (!draft || draft.projectId !== projectId) continue;

    if (decision.approved) {
      let status: TaskDraftStatus = "APPROVED";
      let linearIssueId: string | null = null;
      let linearIssueKey: string | null = null;
      let linearIssueUrl: string | null = null;

      // Auto-create issue in Linear if project is already published
      if (canAutoSync && linearService && freelancer?.linearAccessToken) {
        try {
          const issue = await linearService.createIssue(freelancer.linearAccessToken, {
            teamId: project.linearTeamId || "default_team",
            title: draft.title,
            description: draft.description
              ? `${draft.description}\n\n*[Scope Addendum: Client Approved]*`
              : "*[Scope Addendum: Client Approved]*",
            projectId: project.linearProjectId!,
            priority: draft.priority,
            estimate: draft.estimate ?? undefined,
          });
          status = "SYNCED";
          linearIssueId = issue.id;
          linearIssueKey = issue.identifier;
          linearIssueUrl = issue.url;
          autoSyncedCount++;
        } catch {
          // If auto-sync fails, keep as APPROVED for batch sync
          status = "APPROVED";
        }
      }

      const updated = await draftRepo.updateTaskDraft(draft.id, {
        status,
        clientApprovalStatus: "CLIENT_APPROVED",
        linearIssueId,
        linearIssueKey,
        linearIssueUrl,
      });
      updatedDrafts.push(updated);
    } else {
      const updated = await draftRepo.updateTaskDraft(draft.id, {
        status: "DISCARDED",
        clientApprovalStatus: "CLIENT_REJECTED",
      });
      updatedDrafts.push(updated);
    }
  }

  return { updatedDrafts, autoSyncedCount };
}

export async function updateDraftTask(
  draftId: string,
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
    >
  >,
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
    classification: task.classification || "EXPLICIT",
    clientApprovalStatus: "NOT_REQUIRED",
    evidence: task.evidence ?? null,
    confidence: task.confidence ?? null,
    suggestedMilestone: task.suggestedMilestone ?? null,
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

