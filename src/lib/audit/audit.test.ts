import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  runDualTierVerification,
  runProjectAudit,
  MockGitHubCommitFetcher,
  GeminiSemanticDiffAnalyzer,
  InMemoryAuditRepository,
  TaskToVerify,
  CommitInfo,
} from "./index";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";
import { InMemoryTaskDraftRepository } from "../scope/adapter";

describe("CommitCheck Dual-Tier AI Verification & Audit Engine (VAR-12)", () => {
  it("correlates tasks via Tier 1 syntactic matching and Tier 2 semantic diff analysis", async () => {
    const tasks: TaskToVerify[] = [
      {
        id: "t1",
        key: "VAR-101",
        title: "Implement Stripe Elements UI",
        description: "Embedded payment form with card validation",
        status: "Done",
      },
      {
        id: "t2",
        key: "VAR-102",
        title: "Build Receipt Webhook Endpoint",
        description: "Handle payment_intent.succeeded and dispatch receipts",
        status: "Done",
      },
    ];

    const commits: CommitInfo[] = [
      {
        sha: "sha_001",
        message: "feat(VAR-101): add Stripe Elements checkout form",
        author: "Dev",
        date: new Date().toISOString(),
      },
      {
        sha: "sha_002",
        message: "setup webhook endpoint for payment receipt processing",
        author: "Dev",
        date: new Date().toISOString(),
        diffSnippet: "+ app.post('/webhook', handleReceipt)",
      },
    ];

    const analyzer = new GeminiSemanticDiffAnalyzer();
    const result = await runDualTierVerification({ tasks, commits, analyzer });

    // Task 1: Syntactic Match
    const t1Result = result.verifiedTasks.find((t) => t.issueKey === "VAR-101");
    assert.ok(t1Result);
    assert.strictEqual(t1Result.isVerified, true);
    assert.strictEqual(t1Result.tier, "SYNTACTIC");
    assert.strictEqual(t1Result.confidence, 1.0);

    // Task 2: Semantic Match
    const t2Result = result.verifiedTasks.find((t) => t.issueKey === "VAR-102");
    assert.ok(t2Result);
    assert.strictEqual(t2Result.isVerified, true);
    assert.strictEqual(t2Result.tier, "SEMANTIC");
    assert.ok(t2Result.confidence > 0.5);

    // Score: 2 of 2 verified = 100%
    assert.strictEqual(result.verifiedPercentage, 100);
    assert.strictEqual(result.ghostCompletionsCount, 0);
  });

  it("detects and flags Ghost Completions when a task is marked Done without supporting commits", async () => {
    const tasks: TaskToVerify[] = [
      {
        id: "t_ghost",
        key: "VAR-999",
        title: "Configure Distributed Redis Cache",
        description: "High-throughput session store",
        status: "Done", // Claimed completed
      },
    ];

    const commits: CommitInfo[] = [
      {
        sha: "sha_other",
        message: "chore: update readme documentation",
        author: "Dev",
        date: new Date().toISOString(),
      },
    ];

    const analyzer = new GeminiSemanticDiffAnalyzer();
    const result = await runDualTierVerification({ tasks, commits, analyzer });

    assert.strictEqual(result.verifiedPercentage, 0);
    assert.strictEqual(result.ghostCompletionsCount, 1);

    const ghostDiscrepancy = result.discrepancies.find(
      (d) => d.type === "GHOST_COMPLETION"
    );
    assert.ok(ghostDiscrepancy);
    assert.strictEqual(ghostDiscrepancy.issueKey, "VAR-999");
    assert.strictEqual(ghostDiscrepancy.severity, "HIGH");
    assert.ok(ghostDiscrepancy.suggestedRemediation.includes("VAR-999"));
  });

  it("identifies untracked work when commits do not correspond to any task in scope", async () => {
    const tasks: TaskToVerify[] = [
      {
        id: "t1",
        key: "VAR-101",
        title: "Implement Stripe Elements UI",
        description: "Card elements",
        status: "Done",
      },
    ];

    const commits: CommitInfo[] = [
      {
        sha: "sha_001",
        message: "feat(VAR-101): implement stripe UI",
        author: "Dev",
        date: new Date().toISOString(),
      },
      {
        sha: "sha_untracked",
        message: "refactor: rewrite entire database layer to MongoDB",
        author: "Dev",
        date: new Date().toISOString(),
      },
    ];

    const analyzer = new GeminiSemanticDiffAnalyzer();
    const result = await runDualTierVerification({ tasks, commits, analyzer });

    assert.strictEqual(result.untrackedCommitsCount, 1);
    const untracked = result.discrepancies.find((d) => d.type === "UNTRACKED_WORK");
    assert.ok(untracked);
    assert.ok(untracked.description.includes("sha_unt"));
  });

  it("caches audit reports for 10 minutes when the latest commit SHA has not changed", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const auditRepo = new InMemoryAuditRepository();

    const dev = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_dev_cache",
        email: "alex@developer.io",
      },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(dev.id, {
      title: "Cache Test Project",
      clientEmail: "client@corp.com",
      githubRepoFullName: "dev/cache-test",
    });

    await draftRepo.createTaskDraft({
      meetingId: "m1",
      projectId: project.id,
      title: "Task 1",
      description: "Sample",
      status: "APPROVED",
    });

    const commitFetcher = new MockGitHubCommitFetcher([
      {
        sha: "sha_fixed_123",
        message: "Initial commit",
        author: "Dev",
        date: new Date().toISOString(),
      },
    ]);

    // 1. Initial audit run (not cached)
    const run1 = await runProjectAudit(
      {
        projectId: project.id,
        userId: dev.id,
        auditorRole: "FREELANCER_SELF_CHECK",
      },
      userRepo,
      projectRepo,
      draftRepo,
      commitFetcher,
      new GeminiSemanticDiffAnalyzer(),
      auditRepo
    );

    assert.strictEqual(run1.isCached, false);
    assert.strictEqual(run1.report.latestCommitSha, "sha_fixed_123");

    // 2. Second audit run within 10 minutes with same latest SHA -> cache hit!
    const run2 = await runProjectAudit(
      {
        projectId: project.id,
        userId: dev.id,
        auditorRole: "FREELANCER_SELF_CHECK",
      },
      userRepo,
      projectRepo,
      draftRepo,
      commitFetcher,
      new GeminiSemanticDiffAnalyzer(),
      auditRepo
    );

    assert.strictEqual(run2.isCached, true);
    assert.strictEqual(run2.report.id, run1.report.id);

    // 3. Force refresh -> bypasses cache
    const run3 = await runProjectAudit(
      {
        projectId: project.id,
        userId: dev.id,
        auditorRole: "FREELANCER_SELF_CHECK",
        forceRefresh: true,
      },
      userRepo,
      projectRepo,
      draftRepo,
      commitFetcher,
      new GeminiSemanticDiffAnalyzer(),
      auditRepo
    );

    assert.strictEqual(run3.isCached, false);

    // 4. SHA change -> cache miss
    commitFetcher.setCommits([
      {
        sha: "sha_new_456",
        message: "New work",
        author: "Dev",
        date: new Date().toISOString(),
      },
    ]);

    const run4 = await runProjectAudit(
      {
        projectId: project.id,
        userId: dev.id,
        auditorRole: "FREELANCER_SELF_CHECK",
      },
      userRepo,
      projectRepo,
      draftRepo,
      commitFetcher,
      new GeminiSemanticDiffAnalyzer(),
      auditRepo
    );

    assert.strictEqual(run4.isCached, false);
    assert.strictEqual(run4.report.latestCommitSha, "sha_new_456");
  });

  it("allows both project freelancer and designated client to run audits, but rejects unauthorized users", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const auditRepo = new InMemoryAuditRepository();

    const dev = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_dev_auth",
        email: "dev@commitcheck.com",
      },
      "FREELANCER"
    );

    const client = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "g_client_auth",
        email: "client@acmecorp.com",
      },
      "CLIENT"
    );

    const stranger = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "g_stranger",
        email: "stranger@unknown.com",
      },
      "CLIENT"
    );

    const project = await projectRepo.createProject(
      dev.id,
      {
        title: "Auth Verification Project",
        clientEmail: "client@acmecorp.com",
        githubRepoFullName: "dev/auth-test",
      },
      client.id
    );

    const commitFetcher = new MockGitHubCommitFetcher();

    // Freelancer can audit
    const devAudit = await runProjectAudit(
      {
        projectId: project.id,
        userId: dev.id,
        auditorRole: "FREELANCER_SELF_CHECK",
      },
      userRepo,
      projectRepo,
      draftRepo,
      commitFetcher,
      new GeminiSemanticDiffAnalyzer(),
      auditRepo
    );
    assert.ok(devAudit.report);

    // Client can audit
    const clientAudit = await runProjectAudit(
      {
        projectId: project.id,
        userId: client.id,
        auditorRole: "CLIENT",
      },
      userRepo,
      projectRepo,
      draftRepo,
      commitFetcher,
      new GeminiSemanticDiffAnalyzer(),
      auditRepo
    );
    assert.ok(clientAudit.report);

    // Stranger is rejected
    await assert.rejects(
      async () => {
        await runProjectAudit(
          {
            projectId: project.id,
            userId: stranger.id,
            auditorRole: "CLIENT",
          },
          userRepo,
          projectRepo,
          draftRepo,
          commitFetcher,
          new GeminiSemanticDiffAnalyzer(),
          auditRepo
        );
      },
      {
        message: "Unauthorized: You do not have permission to audit this project.",
      }
    );
  });
});
