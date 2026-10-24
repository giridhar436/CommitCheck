import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createProjectService } from "./service";
import { InMemoryProjectRepository } from "./adapter";
import { MockGitHubService } from "./github";
import { InMemoryUserRepository } from "../auth/adapter";

describe("CommitCheck Project Creation & GitHub Binding (VAR-7)", () => {
  let userRepo: InMemoryUserRepository;
  let projectRepo: InMemoryProjectRepository;
  let gitHubService: MockGitHubService;
  let freelancerId: string;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    projectRepo = new InMemoryProjectRepository();
    gitHubService = new MockGitHubService();

    // Seed a freelancer
    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_100",
        email: "alex@developer.io",
        name: "Alex Dev",
        username: "alexdev",
        accessToken: "gho_valid_token_123",
      },
      "FREELANCER"
    );
    freelancerId = freelancer.id;
  });

  it("successfully creates a project with valid repo binding and client email", async () => {
    const project = await createProjectService(
      freelancerId,
      {
        title: "E-Commerce Stripe Integration",
        description: "Migration to Next.js checkout flow with webhooks",
        clientEmail: "elena@clientcorp.com",
        githubRepoFullName: "freelancer/saas-starter",
      },
      userRepo,
      projectRepo,
      gitHubService
    );

    assert.ok(project.id);
    assert.equal(project.title, "E-Commerce Stripe Integration");
    assert.equal(project.githubRepo, "freelancer/saas-starter");
    assert.equal(project.githubRepoFullName, "freelancer/saas-starter");
    assert.equal(project.clientEmail, "elena@clientcorp.com");
    assert.equal(project.freelancerId, freelancerId);
    assert.equal(project.status, "ACTIVE");

    // Check repository retrieval
    const fetched = await projectRepo.findProjectById(project.id);
    assert.equal(fetched?.title, "E-Commerce Stripe Integration");

    const list = await projectRepo.listProjectsForFreelancer(freelancerId);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, project.id);
  });

  it("automatically associates clientId when the client already exists in the system", async () => {
    // Seed a registered client
    const client = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "goog_client_1",
        email: "client@venturecap.com",
        name: "Sarah Venture",
      },
      "CLIENT"
    );

    const project = await createProjectService(
      freelancerId,
      {
        title: "Mobile App MVP",
        clientEmail: "client@venturecap.com",
        githubRepoFullName: "client-org/crm-integration",
      },
      userRepo,
      projectRepo,
      gitHubService
    );

    assert.equal(project.clientId, client.id);

    const clientProjects = await projectRepo.listProjectsForClient("client@venturecap.com");
    assert.equal(clientProjects.length, 1);
    assert.equal(clientProjects[0].id, project.id);
  });

  it("returns all active projects belonging to a client (e.g. LMS + test2) without returning another client's projects", async () => {
    const clientEmail = "giridhar6520@gmail.com";
    const otherClientEmail = "otherclient@enterprise.com";

    gitHubService.addRepository({
      id: 101,
      name: "lms-core",
      fullName: "dev/lms-core",
      owner: "dev",
      isPrivate: false,
      defaultBranch: "main",
      htmlUrl: "https://github.com/dev/lms-core",
    });
    gitHubService.addRepository({
      id: 102,
      name: "test2-repo",
      fullName: "dev/test2-repo",
      owner: "dev",
      isPrivate: false,
      defaultBranch: "main",
      htmlUrl: "https://github.com/dev/test2-repo",
    });
    gitHubService.addRepository({
      id: 103,
      name: "enterprise-app",
      fullName: "dev/enterprise-app",
      owner: "dev",
      isPrivate: false,
      defaultBranch: "main",
      htmlUrl: "https://github.com/dev/enterprise-app",
    });

    const p1 = await createProjectService(
      freelancerId,
      {
        title: "LMS",
        description: "Learning Management System",
        clientEmail,
        githubRepoFullName: "dev/lms-core",
      },
      userRepo,
      projectRepo,
      gitHubService
    );

    const p2 = await createProjectService(
      freelancerId,
      {
        title: "test2",
        description: "Secondary client project",
        clientEmail,
        githubRepoFullName: "dev/test2-repo",
      },
      userRepo,
      projectRepo,
      gitHubService
    );

    const otherProject = await createProjectService(
      freelancerId,
      {
        title: "Unrelated Enterprise Project",
        description: "Belongs to another client",
        clientEmail: otherClientEmail,
        githubRepoFullName: "dev/enterprise-app",
      },
      userRepo,
      projectRepo,
      gitHubService
    );

    const clientProjects = await projectRepo.listProjectsForClient(clientEmail);
    assert.equal(clientProjects.length, 2);
    const titles = clientProjects.map((p) => p.title);
    assert.ok(titles.includes("LMS"), "Expected LMS to be returned");
    assert.ok(titles.includes("test2"), "Expected test2 to be returned");
    assert.ok(!titles.includes(otherProject.title), "Did not expect other client's project");

    // Case-insensitivity check
    const upperCaseCheck = await projectRepo.listProjectsForClient("GIRIDHAR6520@GMAIL.COM");
    assert.equal(upperCaseCheck.length, 2);
  });

  it("rejects project creation if user is not a FREELANCER", async () => {
    const client = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "goog_client_999",
        email: "sarah@client.io",
      },
      "CLIENT"
    );

    await assert.rejects(
      async () => {
        await createProjectService(
          client.id,
          {
            title: "Client Owned Project",
            clientEmail: "other@client.io",
            githubRepoFullName: "freelancer/saas-starter",
          },
          userRepo,
          projectRepo,
          gitHubService
        );
      },
      {
        message: "Only users with the FREELANCER role can initialize projects.",
      }
    );
  });

  it("rejects invalid repository name formatting", async () => {
    await assert.rejects(
      async () => {
        await createProjectService(
          freelancerId,
          {
            title: "Bad Repo Format",
            clientEmail: "client@test.com",
            githubRepoFullName: "invalid-repo-without-slash",
          },
          userRepo,
          projectRepo,
          gitHubService
        );
      },
      {
        message: "Invalid GitHub repository format. Must be in 'owner/repo' format.",
      }
    );
  });

  it("rejects repository when GitHub denies read access", async () => {
    await assert.rejects(
      async () => {
        await createProjectService(
          freelancerId,
          {
            title: "Unowned Private Repo",
            clientEmail: "client@test.com",
            githubRepoFullName: "secret-corp/top-secret-kernel",
          },
          userRepo,
          projectRepo,
          gitHubService
        );
      },
      {
        message:
          "Access denied: Your GitHub account does not have read access to repository 'secret-corp/top-secret-kernel'.",
      }
    );
  });

  it("rejects invalid client email addresses", async () => {
    await assert.rejects(
      async () => {
        await createProjectService(
          freelancerId,
          {
            title: "Bad Email Test",
            clientEmail: "not-an-email",
            githubRepoFullName: "freelancer/saas-starter",
          },
          userRepo,
          projectRepo,
          gitHubService
        );
      },
      {
        message: "A valid client email address is required.",
      }
    );
  });
});
