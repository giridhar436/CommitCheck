import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { publishProjectToLinear } from "./service";
import { MockLinearService } from "./linear";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";
import { InMemoryTaskDraftRepository } from "../scope/adapter";
import { MockEmailService } from "../notifications";

describe("CommitCheck Linear Project Sync & Resend Stakeholder Notification (VAR-11 / VAR-19)", () => {
  it("successfully publishes approved scope drafts to Linear, creates a Linear Project, syncs issues, and dispatches notification emails", async () => {
    // 1. Setup in-memory adapters
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    // 2. Setup freelancer user with Linear credentials
    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_freelancer_123",
        email: "alex@developer.io",
        name: "Alex Rivera",
      },
      "FREELANCER"
    );

    await userRepo.updateLinearCredentials(freelancer.id, {
      linearAccessToken: "lin_token_alex_live",
      linearRefreshToken: "lin_refresh_alex_live",
      linearWorkspaceId: "ws_acme",
      linearWorkspaceName: "Acme Freelance",
    });

    // 3. Setup Project
    const project = await projectRepo.createProject(freelancer.id, {
      title: "Fintech Mobile MVP",
      description: "Mobile app with secure biometrics and Stripe payments",
      clientEmail: "elena@clientcorp.com",
      githubRepoFullName: "alex-rivera/fintech-mvp",
    });

    // 4. Setup staged TaskDrafts
    const draft1 = await draftRepo.createTaskDraft({
      meetingId: "meet_1",
      projectId: project.id,
      title: "Implement Biometric FaceID Flow",
      description: "Support local iOS FaceID authentication using native Expo plugins",
      priority: 1,
      estimate: 5,
      classification: "EXPLICIT",
      status: "APPROVED",
    });

    const draft2 = await draftRepo.createTaskDraft({
      meetingId: "meet_1",
      projectId: project.id,
      title: "Configure Stripe Customer Portal",
      description: "Embed customer billing portal for subscription upgrades",
      priority: 2,
      estimate: 3,
      classification: "CONFIRMED_COMMITMENT",
      status: "APPROVED",
    });

    // Action: Publish to Linear
    const result = await publishProjectToLinear(
      {
        projectId: project.id,
        freelancerId: freelancer.id,
        teamId: "team_dev",
        appBaseUrl: "https://commitcheck.dev",
      },
      userRepo,
      projectRepo,
      draftRepo,
      linearService,
      emailService
    );

    // 5. Verify Linear Project returned
    assert.ok(result.linearProjectId);
    assert.ok(result.linearProjectUrl);
    assert.strictEqual(result.publishedIssuesCount, 2);
    assert.strictEqual(result.emailNotificationSent, true);

    // 6. Verify Project model updated
    const updatedProject = await projectRepo.findProjectById(project.id);
    assert.strictEqual(updatedProject?.linearProjectId, result.linearProjectId);
    assert.strictEqual(updatedProject?.linearProjectUrl, result.linearProjectUrl);
    assert.strictEqual(updatedProject?.linearTeamId, "team_dev");

    // 7. Verify task drafts updated to SYNCED with Linear issue keys
    const syncedDraft1 = await draftRepo.findDraftById(draft1.id);
    const syncedDraft2 = await draftRepo.findDraftById(draft2.id);

    assert.strictEqual(syncedDraft1?.status, "SYNCED");
    assert.ok(syncedDraft1?.linearIssueKey?.startsWith("DEV-"));
    assert.ok(syncedDraft1?.linearIssueUrl?.includes("issue"));

    assert.strictEqual(syncedDraft2?.status, "SYNCED");
    assert.ok(syncedDraft2?.linearIssueKey?.startsWith("DEV-"));

    // 8. Verify Resend email notification payload contains Linear project link and issue links
    assert.strictEqual(emailService.sentEmails.length, 1);
    const sent = emailService.sentEmails[0];
    assert.strictEqual(sent.projectName, project.title);
    assert.strictEqual(sent.linearProjectUrl, result.linearProjectUrl);
    assert.ok(sent.to.includes("elena@clientcorp.com"));
    assert.ok(sent.to.includes("alex@developer.io"));
    assert.strictEqual(sent.tasks.length, 2);
    assert.ok(sent.tasks[0].url?.includes("issue"));
    assert.ok(sent.tasks[0].identifier?.startsWith("DEV-"));
  });

  it("rejects publish if user is not a FREELANCER", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    const client = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "g_99",
        email: "client@clientcorp.com",
      },
      "CLIENT"
    );

    await assert.rejects(
      async () => {
        await publishProjectToLinear(
          {
            projectId: "proj_1",
            freelancerId: client.id,
          },
          userRepo,
          projectRepo,
          draftRepo,
          linearService,
          emailService
        );
      },
      {
        message: "Only users with the FREELANCER role can publish projects to Linear.",
      }
    );
  });

  it("rejects publish if caller is not the project owner", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    const owner = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_owner", email: "owner@dev.io" },
      "FREELANCER"
    );
    const attacker = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_attacker", email: "attacker@dev.io" },
      "FREELANCER"
    );

    await userRepo.updateLinearCredentials(attacker.id, {
      linearAccessToken: "lin_token_attacker",
      linearWorkspaceId: "ws_attacker",
      linearWorkspaceName: "Attacker WS",
    });

    const project = await projectRepo.createProject(owner.id, {
      title: "Owner Project",
      clientEmail: "stakeholder@corp.com",
      githubRepoFullName: "owner/repo",
    });

    await assert.rejects(
      async () => {
        await publishProjectToLinear(
          { projectId: project.id, freelancerId: attacker.id },
          userRepo,
          projectRepo,
          draftRepo,
          linearService,
          emailService
        );
      },
      {
        message: "Unauthorized: You do not own this project.",
      }
    );
  });

  it("rejects publish if freelancer has not connected Linear", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_unconnected",
        email: "dev@unconnected.io",
      },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Mobile App",
      clientEmail: "stakeholder@corp.com",
      githubRepoFullName: "org/mobile-app",
    });

    await assert.rejects(
      async () => {
        await publishProjectToLinear(
          {
            projectId: project.id,
            freelancerId: freelancer.id,
          },
          userRepo,
          projectRepo,
          draftRepo,
          linearService,
          emailService
        );
      },
      {
        message: "Linear workspace not connected. Please connect your Linear account in settings before publishing.",
      }
    );
  });

  it("rejects publish if there are no approved scope drafts", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_ready",
        email: "ready@developer.io",
      },
      "FREELANCER"
    );

    await userRepo.updateLinearCredentials(freelancer.id, {
      linearAccessToken: "lin_token_123",
      linearWorkspaceId: "ws_123",
      linearWorkspaceName: "Workspace",
    });

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Empty Project",
      clientEmail: "stakeholder@corp.com",
      githubRepoFullName: "org/empty",
    });

    await assert.rejects(
      async () => {
        await publishProjectToLinear(
          {
            projectId: project.id,
            freelancerId: freelancer.id,
          },
          userRepo,
          projectRepo,
          draftRepo,
          linearService,
          emailService
        );
      },
      {
        message: "No approved scope items to publish. Please review and approve deliverables before publishing.",
      }
    );
  });

  it("strictly excludes tentative, unconfirmed AI-inferred, and CLIENT_REJECTED items from being published", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    const freelancer = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_protect", email: "protect@dev.io" },
      "FREELANCER"
    );

    await userRepo.updateLinearCredentials(freelancer.id, {
      linearAccessToken: "lin_token_protect",
      linearWorkspaceId: "ws_protect",
      linearWorkspaceName: "Protect Workspace",
    });

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Protected Scope Project",
      clientEmail: "client@protect.io",
      githubRepoFullName: "org/protected",
    });

    // 1. Explicit item (should be published)
    await draftRepo.createTaskDraft({
      meetingId: "m1",
      projectId: project.id,
      title: "Core Database Schema",
      description: "Prisma schema setup",
      priority: 1,
      classification: "EXPLICIT",
      status: "APPROVED",
    });

    // 2. Confirmed commitment item (should be published)
    await draftRepo.createTaskDraft({
      meetingId: "m1",
      projectId: project.id,
      title: "Implement Stripe Webhook",
      description: "Handle checkout events",
      priority: 2,
      classification: "CONFIRMED_COMMITMENT",
      status: "APPROVED",
    });

    // 3. AI-inferred item APPROVED by client (should be published)
    await draftRepo.createTaskDraft({
      meetingId: "m1",
      projectId: project.id,
      title: "Redis Rate Limiter",
      description: "Client approved addition",
      priority: 3,
      classification: "AI_INFERRED",
      clientApprovalStatus: "CLIENT_APPROVED",
      status: "APPROVED",
    });

    // 4. Tentative item NOT confirmed by client (MUST NOT be published)
    await draftRepo.createTaskDraft({
      meetingId: "m1",
      projectId: project.id,
      title: "Voice Notes Transcription",
      description: "Casual client suggestion",
      priority: 4,
      classification: "TENTATIVE",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      status: "DRAFT",
    });

    // 5. AI-inferred item NOT confirmed by client (MUST NOT be published)
    await draftRepo.createTaskDraft({
      meetingId: "m1",
      projectId: project.id,
      title: "GraphQL Subscriptions",
      description: "AI-suggested baseline",
      priority: 3,
      classification: "AI_INFERRED",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      status: "DRAFT",
    });

    // 6. Explicit item that was CLIENT_REJECTED (MUST NOT be published)
    await draftRepo.createTaskDraft({
      meetingId: "m1",
      projectId: project.id,
      title: "Legacy SMS Auth",
      description: "Explicitly rejected by client during scope review",
      priority: 1,
      classification: "EXPLICIT",
      clientApprovalStatus: "CLIENT_REJECTED",
      status: "DRAFT",
    });

    const result = await publishProjectToLinear(
      { projectId: project.id, freelancerId: freelancer.id },
      userRepo,
      projectRepo,
      draftRepo,
      linearService,
      emailService
    );

    // Exactly 3 items should have been published: Core DB, Stripe Webhook, Redis Rate Limiter
    assert.strictEqual(result.publishedIssuesCount, 3);
    const titles = result.publishedIssues.map((i) => i.title);
    assert.ok(titles.includes("Core Database Schema"));
    assert.ok(titles.includes("Implement Stripe Webhook"));
    assert.ok(titles.includes("Redis Rate Limiter"));

    // Ensure rejected and unapproved items are never published
    assert.ok(!titles.includes("Voice Notes Transcription"));
    assert.ok(!titles.includes("GraphQL Subscriptions"));
    assert.ok(!titles.includes("Legacy SMS Auth"));

    // Verify draft status in repo
    const rejectedDraft = (await draftRepo.listDraftsForProject(project.id)).find(
      (d) => d.title === "Legacy SMS Auth"
    );
    assert.strictEqual(rejectedDraft?.status, "DRAFT");
    assert.strictEqual(rejectedDraft?.linearIssueId, null);
  });

  it("surfaces Linear GraphQL errors during publishing without completing sync", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    const freelancer = await userRepo.upsertOAuthUser(
      { provider: "github", providerId: "gh_gql_err", email: "gql@dev.io" },
      "FREELANCER"
    );

    await userRepo.updateLinearCredentials(freelancer.id, {
      linearAccessToken: "lin_token_err",
      linearWorkspaceId: "ws_err",
      linearWorkspaceName: "Err Workspace",
    });

    const project = await projectRepo.createProject(freelancer.id, {
      title: "GraphQL Error Project",
      clientEmail: "client@err.io",
      githubRepoFullName: "org/err",
    });

    await draftRepo.createTaskDraft({
      meetingId: "m_err",
      projectId: project.id,
      title: "Valid Task",
      description: "Valid description",
      priority: 1,
      classification: "EXPLICIT",
      status: "APPROVED",
    });

    // Simulate GraphQL failure in Linear service
    linearService.simulateGraphQLError = "Rate limit exceeded on Linear API";

    await assert.rejects(
      async () => {
        await publishProjectToLinear(
          { projectId: project.id, freelancerId: freelancer.id },
          userRepo,
          projectRepo,
          draftRepo,
          linearService,
          emailService
        );
      },
      {
        message: /Linear GraphQL error: Rate limit exceeded on Linear API/,
      }
    );

    // Verify project linearProjectId was not set
    const freshProject = await projectRepo.findProjectById(project.id);
    assert.strictEqual(freshProject?.linearProjectId, null);
  });
});
