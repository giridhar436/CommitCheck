import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  triggerScopeExtraction,
  updateDraftTask,
  createManualDraftTask,
  deleteDraftTask,
  approveAllDraftTasks,
  MockExtractionService,
  InMemoryTaskDraftRepository,
} from "./index";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryMeetingRepository } from "../meetings/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";

describe("CommitCheck AI Scope Extraction & Pre-Publish Review Staging (VAR-10)", () => {
  const sampleTranscript = `
[00:00] Alice: Hey Bob, thanks for jumping on. For this sprint, we need Stripe checkout integrated.
[00:15] Bob: Got it. We need the embedded payment elements, plus webhook processing for payment_intent.succeeded.
[00:30] Alice: Exactly. Also make sure there are automated tests for card declines.
`;

  it("extracts structured actionable tasks from a meeting transcript via LLM extraction service", async () => {
    const mockLLM = new MockExtractionService();
    const tasks = await mockLLM.extractTasksFromTranscript(sampleTranscript);

    assert.ok(Array.isArray(tasks));
    assert.strictEqual(tasks.length, 3);
    assert.strictEqual(tasks[0].title, "Implement Stripe Elements UI");
    assert.strictEqual(tasks[0].priority, 2);
    assert.strictEqual(tasks[0].estimate, 3);
  });

  it("successfully triggers scope extraction, stages drafts in repository, and associates with project and meeting", async () => {
    const userRepo = new InMemoryUserRepository();
    const meetingRepo = new InMemoryMeetingRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const llm = new MockExtractionService();

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_123",
        email: "dev@commitcheck.com",
        name: "Dev Bob",
      },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Fintech App",
      description: "Checkout integration",
      clientEmail: "alice@acme.com",
      githubRepoFullName: "bob/fintech-app",
    });

    const meeting = await meetingRepo.createMeeting(
      project.id,
      "https://meet.google.com/abc-defg-hij",
      "bot_123",
      "COMPLETED"
    );

    await meetingRepo.updateMeetingStatus(meeting.id, "COMPLETED", sampleTranscript);

    const drafts = await triggerScopeExtraction(
      meeting.id,
      freelancer.id,
      userRepo,
      meetingRepo,
      projectRepo,
      draftRepo,
      llm
    );

    assert.strictEqual(drafts.length, 3);
    assert.strictEqual(drafts[0].status, "DRAFT");
    assert.strictEqual(drafts[0].projectId, project.id);
    assert.strictEqual(drafts[0].meetingId, meeting.id);

    const listed = await draftRepo.listDraftsForMeeting(meeting.id);
    assert.strictEqual(listed.length, 3);
  });

  it("rejects scope extraction if the requesting user is not a FREELANCER", async () => {
    const userRepo = new InMemoryUserRepository();
    const meetingRepo = new InMemoryMeetingRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const llm = new MockExtractionService();

    const client = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "g_456",
        email: "client@acme.com",
        name: "Alice Acme",
      },
      "CLIENT"
    );

    await assert.rejects(
      async () => {
        await triggerScopeExtraction(
          "meeting_1",
          client.id,
          userRepo,
          meetingRepo,
          projectRepo,
          draftRepo,
          llm
        );
      },
      {
        message: "Only users with the FREELANCER role can extract scope.",
      }
    );
  });

  it("rejects scope extraction if meeting has no transcript yet", async () => {
    const userRepo = new InMemoryUserRepository();
    const meetingRepo = new InMemoryMeetingRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const llm = new MockExtractionService();

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_789",
        email: "freelancer@commitcheck.com",
      },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Project Alpha",
      clientEmail: "alice@acme.com",
      githubRepoFullName: "org/alpha",
    });

    const meeting = await meetingRepo.createMeeting(
      project.id,
      "https://meet.google.com/xyz-uvwx-rst",
      "bot_789",
      "RECORDING"
    );

    await assert.rejects(
      async () => {
        await triggerScopeExtraction(
          meeting.id,
          freelancer.id,
          userRepo,
          meetingRepo,
          projectRepo,
          draftRepo,
          llm
        );
      },
      {
        message: "Cannot extract scope: Meeting has no transcript yet.",
      }
    );
  });

  it("rejects scope extraction if freelancer does not own the project", async () => {
    const userRepo = new InMemoryUserRepository();
    const meetingRepo = new InMemoryMeetingRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const llm = new MockExtractionService();

    const owner = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_owner",
        email: "owner@commitcheck.com",
      },
      "FREELANCER"
    );

    const otherDev = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_other",
        email: "other@commitcheck.com",
      },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(owner.id, {
      title: "Secret Project",
      clientEmail: "alice@acme.com",
      githubRepoFullName: "owner/secret",
    });

    const meeting = await meetingRepo.createMeeting(
      project.id,
      "https://meet.google.com/abc-defg-hij",
      "bot_owner",
      "COMPLETED"
    );
    await meetingRepo.updateMeetingStatus(meeting.id, "COMPLETED", sampleTranscript);

    await assert.rejects(
      async () => {
        await triggerScopeExtraction(
          meeting.id,
          otherDev.id,
          userRepo,
          meetingRepo,
          projectRepo,
          draftRepo,
          llm
        );
      },
      {
        message: "Unauthorized: You do not own this project.",
      }
    );
  });

  it("supports manual task addition, updates, deletion, and full scope approval", async () => {
    const draftRepo = new InMemoryTaskDraftRepository();

    // 1. Create manual task
    const manualTask = await createManualDraftTask(
      "meet_test",
      "proj_test",
      {
        title: "Setup Sentry Error Tracking",
        description: "Configure DSN and performance monitoring",
        priority: 3,
        estimate: 1,
      },
      draftRepo
    );

    assert.strictEqual(manualTask.title, "Setup Sentry Error Tracking");
    assert.strictEqual(manualTask.status, "DRAFT");
    assert.strictEqual(manualTask.estimate, 1);

    // 2. Update task
    const updated = await updateDraftTask(
      manualTask.id,
      {
        title: "Setup Sentry & LogRocket Error Tracking",
        priority: 2,
        estimate: 2,
      },
      draftRepo
    );

    assert.strictEqual(updated.title, "Setup Sentry & LogRocket Error Tracking");
    assert.strictEqual(updated.priority, 2);
    assert.strictEqual(updated.estimate, 2);

    // 3. Approve all tasks
    const approved = await approveAllDraftTasks("meet_test", draftRepo);
    assert.strictEqual(approved.length, 1);
    assert.strictEqual(approved[0].status, "APPROVED");

    // 4. Delete task
    await deleteDraftTask(manualTask.id, draftRepo);
    const afterDelete = await draftRepo.findDraftById(manualTask.id);
    assert.strictEqual(afterDelete, null);
  });
});
