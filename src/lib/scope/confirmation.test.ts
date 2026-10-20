import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  requestClientScopeConfirmation,
  confirmClientScopeItems,
} from "./service";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";
import { InMemoryTaskDraftRepository } from "./adapter";
import { MockEmailService, ResendEmailService } from "../notifications/email";
import { MockLinearService } from "../linear/linear";

describe("CommitCheck Resend Client Scope Confirmation Loop & Approval Portal (VAR-18)", () => {
  it("allows freelancer to request scope confirmation, itemizing pending drafts and sending email via Resend", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const emailService = new MockEmailService();

    // 1. Create freelancer and project
    const dev = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_dev_1", email: "dev@commitcheck.dev", name: "Dev" },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(dev.id, {
      title: "Fintech Platform",
      description: "Payment integration and scope protection",
      clientEmail: "elena@acme.corp",
      githubRepoFullName: "dev/fintech-platform",
    });

    // 2. Create explicit (auto-approved) draft
    await draftRepo.createTaskDraft({
      meetingId: "m_1",
      projectId: project.id,
      title: "Stripe Connect Onboarding",
      description: "Direct seller onboarding flow",
      priority: 2,
      classification: "EXPLICIT",
      clientApprovalStatus: "NOT_REQUIRED",
      status: "DRAFT",
    });

    // 3. Create tentative and AI-inferred drafts awaiting client confirmation
    const tentativeDraft = await draftRepo.createTaskDraft({
      meetingId: "m_1",
      projectId: project.id,
      title: "AI Receipt Scanning",
      description: "Optical character recognition for receipts",
      priority: 3,
      estimate: 5,
      classification: "TENTATIVE",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      evidence: "Maybe we could let users snap photos of paper receipts?",
      status: "DRAFT",
    });

    const inferredDraft = await draftRepo.createTaskDraft({
      meetingId: "m_1",
      projectId: project.id,
      title: "Redis Session Caching",
      description: "Cache session tokens for high-throughput endpoints",
      priority: 3,
      estimate: 2,
      classification: "AI_INFERRED",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      evidence: "Inferred from performance requirement",
      status: "DRAFT",
    });

    // 4. Freelancer triggers request confirmation
    const result = await requestClientScopeConfirmation(
      project.id,
      dev.id,
      userRepo,
      projectRepo,
      draftRepo,
      emailService,
      "https://commitcheck.dev"
    );

    // 5. Verify email dispatch and itemization
    assert.strictEqual(result.emailSent, true);
    assert.strictEqual(result.requestedCount, 2);
    assert.ok(result.message.includes("elena@acme.corp"));

    assert.strictEqual(emailService.confirmationEmails.length, 1);
    const sentEmail = emailService.confirmationEmails[0];
    assert.strictEqual(sentEmail.to, "elena@acme.corp");
    assert.strictEqual(sentEmail.projectName, "Fintech Platform");
    assert.strictEqual(
      sentEmail.confirmationUrl,
      `https://commitcheck.dev/client/projects/${project.id}/scope-confirmation`
    );
    assert.strictEqual(sentEmail.items.length, 2);
    assert.strictEqual(sentEmail.items[0].title, tentativeDraft.title);
    assert.strictEqual(sentEmail.items[0].classification, "TENTATIVE");
    assert.strictEqual(sentEmail.items[0].evidence, tentativeDraft.evidence);
    assert.strictEqual(sentEmail.items[1].title, inferredDraft.title);
    assert.strictEqual(sentEmail.items[1].classification, "AI_INFERRED");
  });

  it("rejects request confirmation if user is not the project freelancer", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const emailService = new MockEmailService();

    const dev = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_dev_owner", email: "owner@commitcheck.dev" },
      "FREELANCER"
    );

    const otherDev = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_other", email: "other@commitcheck.dev" },
      "FREELANCER"
    );

    const client = await userRepo.upsertOAuthUser(
      { provider: "google", providerId: "g_client", email: "client@test.com" },
      "CLIENT"
    );

    const project = await projectRepo.createProject(dev.id, {
      title: "Private Project",
      clientEmail: "client@test.com",
      githubRepoFullName: "owner/repo",
    });

    // Rejection 1: Non-freelancer role
    await assert.rejects(
      async () => {
        await requestClientScopeConfirmation(
          project.id,
          client.id,
          userRepo,
          projectRepo,
          draftRepo,
          emailService
        );
      },
      { message: "Only users with the FREELANCER role can request scope confirmation." }
    );

    // Rejection 2: Unowned project
    await assert.rejects(
      async () => {
        await requestClientScopeConfirmation(
          project.id,
          otherDev.id,
          userRepo,
          projectRepo,
          draftRepo,
          emailService
        );
      },
      { message: "Unauthorized: You do not own this project." }
    );
  });

  it("returns 0 requested if no items are pending client approval", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const emailService = new MockEmailService();

    const dev = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_dev_clean", email: "clean@commitcheck.dev" },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(dev.id, {
      title: "Clean Scope Project",
      clientEmail: "elena@acme.corp",
      githubRepoFullName: "dev/clean",
    });

    // Only explicit items
    await draftRepo.createTaskDraft({
      meetingId: "m_clean",
      projectId: project.id,
      title: "Core API Setup",
      description: "Direct explicit requirement",
      classification: "EXPLICIT",
      clientApprovalStatus: "NOT_REQUIRED",
    });

    const result = await requestClientScopeConfirmation(
      project.id,
      dev.id,
      userRepo,
      projectRepo,
      draftRepo,
      emailService
    );

    assert.strictEqual(result.requestedCount, 0);
    assert.strictEqual(result.emailSent, false);
    assert.strictEqual(emailService.confirmationEmails.length, 0);
  });

  it("allows client to confirm items before Linear publishing, updating statuses appropriately", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();

    const dev = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_dev_pre", email: "dev@test.io" },
      "FREELANCER"
    );

    const client = await userRepo.upsertOAuthUser(
      { provider: "google", providerId: "g_client_pre", email: "client@acme.com" },
      "CLIENT"
    );

    const project = await projectRepo.createProject(dev.id, {
      title: "Pre-Publish Project",
      clientEmail: "client@acme.com",
      githubRepoFullName: "dev/pre-publish",
    });

    const draft1 = await draftRepo.createTaskDraft({
      meetingId: "m_1",
      projectId: project.id,
      title: "Export to CSV",
      description: "User data export",
      classification: "TENTATIVE",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      status: "DRAFT",
    });

    const draft2 = await draftRepo.createTaskDraft({
      meetingId: "m_1",
      projectId: project.id,
      title: "SMS Notifications",
      description: "Twilio alerts",
      classification: "AI_INFERRED",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      status: "DRAFT",
    });

    // Client approves draft1, rejects draft2
    const confirmResult = await confirmClientScopeItems(
      project.id,
      client.id,
      [
        { draftId: draft1.id, approved: true },
        { draftId: draft2.id, approved: false },
      ],
      userRepo,
      projectRepo,
      draftRepo
    );

    assert.strictEqual(confirmResult.updatedDrafts.length, 2);
    assert.strictEqual(confirmResult.autoSyncedCount, 0);

    const approvedItem = await draftRepo.findDraftById(draft1.id);
    assert.strictEqual(approvedItem?.clientApprovalStatus, "CLIENT_APPROVED");
    assert.strictEqual(approvedItem?.status, "APPROVED");

    const rejectedItem = await draftRepo.findDraftById(draft2.id);
    assert.strictEqual(rejectedItem?.clientApprovalStatus, "CLIENT_REJECTED");
    assert.strictEqual(rejectedItem?.status, "DISCARDED");
  });

  it("automatically creates Linear issues as a Scope Addendum when project is already published to Linear", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();

    const dev = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_dev_linear", email: "dev@agency.com" },
      "FREELANCER"
    );

    await userRepo.updateLinearCredentials(dev.id, {
      linearAccessToken: "lin_token_active_live",
      linearWorkspaceId: "ws_linear",
      linearWorkspaceName: "Active Linear Workspace",
    });

    const client = await userRepo.upsertOAuthUser(
      { provider: "google", providerId: "g_client_linear", email: "sponsor@enterprise.com" },
      "CLIENT"
    );

    const project = await projectRepo.createProject(dev.id, {
      title: "Live Production App",
      clientEmail: "sponsor@enterprise.com",
      githubRepoFullName: "dev/live-app",
    });

    // Simulate already-published Linear project
    await projectRepo.updateLinearProject(project.id, {
      linearProjectId: "lin_proj_live_999",
      linearProjectUrl: "https://linear.app/agency/project/live-production-app",
      linearTeamId: "team_dev",
    });

    const addendumDraft = await draftRepo.createTaskDraft({
      meetingId: "m_followup",
      projectId: project.id,
      title: "Real-Time WebSocket Sync",
      description: "Push notifications via WebSockets",
      priority: 2,
      estimate: 3,
      classification: "TENTATIVE",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      status: "DRAFT",
    });

    // Client confirms the addendum item
    const confirmResult = await confirmClientScopeItems(
      project.id,
      client.id,
      [{ draftId: addendumDraft.id, approved: true }],
      userRepo,
      projectRepo,
      draftRepo,
      linearService
    );

    assert.strictEqual(confirmResult.autoSyncedCount, 1);
    assert.strictEqual(confirmResult.updatedDrafts.length, 1);

    // Verify issue was created on Linear
    assert.strictEqual(linearService.createdIssues.length, 1);
    const createdIssue = linearService.createdIssues[0];
    assert.strictEqual(createdIssue.title, "Real-Time WebSocket Sync");
    assert.ok(createdIssue.identifier.startsWith("DEV-"));

    // Verify draft was marked SYNCED with Linear keys
    const updatedDraft = await draftRepo.findDraftById(addendumDraft.id);
    assert.strictEqual(updatedDraft?.status, "SYNCED");
    assert.strictEqual(updatedDraft?.clientApprovalStatus, "CLIENT_APPROVED");
    assert.strictEqual(updatedDraft?.linearIssueId, createdIssue.id);
    assert.strictEqual(updatedDraft?.linearIssueKey, createdIssue.identifier);
    assert.strictEqual(updatedDraft?.linearIssueUrl, createdIssue.url);
  });

  it("rejects confirmation if caller is not the authorized project client", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();

    const dev = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_dev_auth", email: "dev@corp.com" },
      "FREELANCER"
    );

    const client1 = await userRepo.upsertOAuthUser(
      { provider: "google", providerId: "g_client_1", email: "authorized@client.com" },
      "CLIENT"
    );

    const client2 = await userRepo.upsertOAuthUser(
      { provider: "google", providerId: "g_client_2", email: "unauthorized@client.com" },
      "CLIENT"
    );

    const project = await projectRepo.createProject(dev.id, {
      title: "Secured Project",
      clientEmail: "authorized@client.com",
      githubRepoFullName: "dev/secure",
    });

    const draft = await draftRepo.createTaskDraft({
      meetingId: "m_sec",
      projectId: project.id,
      title: "Audit Log Export",
      description: "Export audit trails",
      classification: "TENTATIVE",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
    });

    await assert.rejects(
      async () => {
        await confirmClientScopeItems(
          project.id,
          client2.id, // client2 email does not match project.clientEmail
          [{ draftId: draft.id, approved: true }],
          userRepo,
          projectRepo,
          draftRepo
        );
      },
      {
        message: "Unauthorized: You do not have permission to confirm scope for this project.",
      }
    );
  });

  it("verifies ResendEmailService handles mock mode and delivers confirmation email payload structure", async () => {
    const resend = new ResendEmailService("re_mock_test_key", "notifications@commitcheck.dev");

    const result = await resend.sendScopeConfirmationEmail({
      to: "client@test.com",
      projectName: "Test Project",
      confirmationUrl: "https://commitcheck.dev/client/projects/p_1/scope-confirmation",
      items: [
        {
          title: "Tentative Feature",
          description: "Described in call",
          classification: "TENTATIVE",
          evidence: "Could be nice to have",
          estimate: 3,
        },
      ],
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.id.startsWith("mock_email_"));
  });
});
