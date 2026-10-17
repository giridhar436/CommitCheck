import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  publishProjectToLinear,
  MockLinearService,
} from "./index";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";
import { InMemoryTaskDraftRepository } from "../scope/adapter";
import { MockEmailService } from "../notifications/email";

describe("CommitCheck Linear Project Sync & Resend Stakeholder Notification (VAR-11)", () => {
  it("successfully publishes approved scope drafts to Linear, creates a Linear Project, syncs issues, and dispatches notification emails", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    // 1. Seed connected freelancer
    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_101",
        email: "alex@developer.io",
        name: "Alex Developer",
      },
      "FREELANCER"
    );

    await userRepo.updateLinearCredentials(freelancer.id, {
      linearAccessToken: "lin_token_valid_123",
      linearRefreshToken: "lin_refresh_valid_123",
      linearWorkspaceId: "ws_acme",
      linearWorkspaceName: "Acme Freelance Studio",
    });

    // 2. Seed project
    const project = await projectRepo.createProject(freelancer.id, {
      title: "E-Commerce Stripe Integration",
      description: "Checkout workflow and automated tests",
      clientEmail: "elena@clientcorp.com",
      githubRepoFullName: "alex-dev/ecommerce-stripe",
    });

    // 3. Seed approved drafts
    const draft1 = await draftRepo.createTaskDraft({
      meetingId: "meet_1",
      projectId: project.id,
      title: "Implement Stripe Elements UI",
      description: "Embed credit card form with inline validation",
      priority: 2,
      estimate: 3,
      status: "APPROVED",
    });

    const draft2 = await draftRepo.createTaskDraft({
      meetingId: "meet_1",
      projectId: project.id,
      title: "Build Receipt Webhook Endpoint",
      description: "Handle payment_intent.succeeded and dispatch receipts",
      priority: 2,
      estimate: 2,
      status: "APPROVED",
    });

    // 4. Trigger publish to Linear
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

    // 8. Verify Resend email notification
    assert.strictEqual(emailService.sentEmails.length, 1);
    const sent = emailService.sentEmails[0];
    assert.strictEqual(sent.projectName, project.title);
    assert.strictEqual(sent.linearProjectUrl, result.linearProjectUrl);
    assert.ok(sent.to.includes("elena@clientcorp.com"));
    assert.ok(sent.to.includes("alex@developer.io"));
    assert.strictEqual(sent.tasks.length, 2);
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
});
