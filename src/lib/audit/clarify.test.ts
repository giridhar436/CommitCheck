import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";
import { EmailNotificationService, ScopeNotificationEmailInput } from "../notifications";

// Mock email service to capture sent emails
class MockEmailService implements EmailNotificationService {
  public sentEmails: ScopeNotificationEmailInput[] = [];

  async sendScopeApprovedEmail(options: ScopeNotificationEmailInput) {
    this.sentEmails.push(options);
    return { success: true, id: `mock_email_${Date.now()}` };
  }

  async sendScopeConfirmationEmail() {
    return { success: true, id: `mock_email_${Date.now()}` };
  }
}

// Service function modeling the clarification dispatch logic
export async function sendClarificationRequest({
  projectId,
  userId,
  userEmail,
  issueKey,
  taskTitle,
  question,
  appBaseUrl = "https://commitcheck.io",
  userRepo,
  projectRepo,
  emailService,
}: {
  projectId: string;
  userId: string;
  userEmail: string;
  issueKey?: string;
  taskTitle?: string;
  question: string;
  appBaseUrl?: string;
  userRepo: InMemoryUserRepository;
  projectRepo: InMemoryProjectRepository;
  emailService: MockEmailService;
}) {
  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const isFreelancer = project.freelancerId === userId;
  const isClient =
    project.clientId === userId ||
    (project.clientEmail && project.clientEmail.toLowerCase() === userEmail.toLowerCase());

  if (!isFreelancer && !isClient) {
    throw new Error("Unauthorized: Not permitted to request clarification on this project");
  }

  if (!question || !question.trim()) {
    throw new Error("Clarification question is required");
  }

  const freelancer = await userRepo.findById(project.freelancerId);
  if (!freelancer || !freelancer.email) {
    throw new Error("Freelancer contact not found");
  }

  const projectPortalUrl = `${appBaseUrl}/freelancer/projects/${project.id}`;

  const result = await emailService.sendScopeApprovedEmail({
    to: [freelancer.email],
    projectName: project.title,
    linearProjectUrl: project.linearProjectUrl || projectPortalUrl,
    milestoneSummary: `Clarification Question on ${issueKey || "Task"}: "${question.trim()}"`,
    portalUrl: projectPortalUrl,
    tasks: [
      {
        title: `${issueKey ? `[${issueKey}] ` : ""}${taskTitle || "Task"}`,
        priority: 1,
      },
    ],
  });

  return {
    success: true,
    recipient: freelancer.email,
    emailResult: result,
  };
}

describe("CommitCheck Executive Clarification Loop (VAR-13)", () => {
  it("allows client to dispatch a clarification request on a flagged task to the freelancer", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const emailService = new MockEmailService();

    // 1. Create freelancer and client
    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_freelancer_clarify",
        email: "sarah.dev@commitcheck.io",
        name: "Sarah Dev",
      },
      "FREELANCER"
    );

    const client = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "g_client_clarify",
        email: "executive@clientcorp.com",
        name: "Executive Client",
      },
      "CLIENT"
    );

    // 2. Create project
    const project = await projectRepo.createProject(
      freelancer.id,
      {
        title: "Enterprise Checkout Gateway",
        clientEmail: "executive@clientcorp.com",
        githubRepoFullName: "org/checkout",
      },
      client.id
    );

    // 3. Client sends clarification on ghost completion VAR-105
    const result = await sendClarificationRequest({
      projectId: project.id,
      userId: client.id,
      userEmail: client.email!,
      issueKey: "VAR-105",
      taskTitle: "Implement Apple Pay Direct",
      question: "This task is marked Done in Linear, but no commits reference it. Did work happen on another branch?",
      userRepo,
      projectRepo,
      emailService,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.recipient, "sarah.dev@commitcheck.io");
    assert.strictEqual(emailService.sentEmails.length, 1);

    const sent = emailService.sentEmails[0];
    assert.deepStrictEqual(sent.to, ["sarah.dev@commitcheck.io"]);
    assert.strictEqual(sent.projectName, "Enterprise Checkout Gateway");
    assert.ok(sent.milestoneSummary.includes("VAR-105"));
    assert.ok(sent.milestoneSummary.includes("Did work happen on another branch?"));
    assert.ok(sent.tasks[0].title.includes("[VAR-105] Implement Apple Pay Direct"));
  });

  it("rejects clarification requests with empty or whitespace-only questions", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const emailService = new MockEmailService();

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_free_empty",
        email: "dev@commitcheck.io",
      },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Test Project",
      clientEmail: "client@test.com",
      githubRepoFullName: "dev/repo",
    });

    await assert.rejects(
      async () => {
        await sendClarificationRequest({
          projectId: project.id,
          userId: freelancer.id,
          userEmail: freelancer.email!,
          issueKey: "VAR-101",
          taskTitle: "Sample Task",
          question: "    ",
          userRepo,
          projectRepo,
          emailService,
        });
      },
      {
        message: "Clarification question is required",
      }
    );
  });

  it("blocks unauthorized users who are neither the project freelancer nor assigned client", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const emailService = new MockEmailService();

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_free_auth",
        email: "dev@commitcheck.io",
      },
      "FREELANCER"
    );

    const intruder = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "g_intruder",
        email: "intruder@badactor.com",
      },
      "CLIENT"
    );

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Protected Project",
      clientEmail: "legit.client@test.com",
      githubRepoFullName: "dev/repo",
    });

    await assert.rejects(
      async () => {
        await sendClarificationRequest({
          projectId: project.id,
          userId: intruder.id,
          userEmail: intruder.email!,
          issueKey: "VAR-200",
          taskTitle: "Secret Task",
          question: "Can I see internal progress?",
          userRepo,
          projectRepo,
          emailService,
        });
      },
      {
        message: "Unauthorized: Not permitted to request clarification on this project",
      }
    );
  });
});
