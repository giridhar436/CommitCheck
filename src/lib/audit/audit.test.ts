import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  runDualTierVerification,
  runProjectAudit,
  MockGitHubCommitFetcher,
  LiveGitHubCommitFetcher,
  LiveLinearIssueFetcher,
  MockLinearIssueFetcher,
  GeminiSemanticDiffAnalyzer,
  InMemoryAuditRepository,
  TaskToVerify,
  CommitInfo,
  LinearIssueFetcher,
} from "./index";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";
import { InMemoryTaskDraftRepository } from "../scope/adapter";
import { MockLinearService } from "../linear/linear";

describe("CommitCheck Dual-Tier AI Verification & Audit Engine (VAR-12 / VAR-20)", () => {
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

  it("verifies Tier 1 matching through branch names even when commit messages lack ticket keys", async () => {
    const tasks: TaskToVerify[] = [
      {
        id: "t_branch_match",
        key: "DEV-202",
        title: "User Profile Settings Modal",
        description: "Allow users to update name and notification preferences",
        status: "Done",
      },
      {
        id: "t_repo_branch",
        key: "DEV-303",
        title: "Apple Pay Integration",
        description: "One-click mobile checkout with Apple Pay",
        status: "Done",
      },
    ];

    const commits: CommitInfo[] = [
      {
        sha: "sha_branch_1",
        message: "style: cleanup form padding and modal transition animations",
        author: "Dev",
        date: new Date().toISOString(),
        branchName: "feature/DEV-202-user-profile-modal",
      },
      {
        sha: "sha_branch_2",
        message: "initial payment sheet scaffolding",
        author: "Dev",
        date: new Date().toISOString(),
        branchName: "main",
      },
    ];

    const analyzer = new GeminiSemanticDiffAnalyzer();
    const result = await runDualTierVerification({
      tasks,
      commits,
      analyzer,
      repoBranches: ["main", "feature/DEV-303-apple-pay"],
    });

    // 1. DEV-202 matched via commit.branchName
    const t1 = result.verifiedTasks.find((t) => t.issueKey === "DEV-202");
    assert.ok(t1);
    assert.strictEqual(t1.isVerified, true);
    assert.strictEqual(t1.tier, "SYNTACTIC");
    assert.strictEqual(t1.confidence, 1.0);
    assert.ok(t1.reasoning.includes("branch name"));

    // 2. DEV-303 matched via repoBranches
    const t2 = result.verifiedTasks.find((t) => t.issueKey === "DEV-303");
    assert.ok(t2);
    assert.strictEqual(t2.isVerified, true);
    assert.strictEqual(t2.tier, "SYNTACTIC");
    assert.strictEqual(t2.confidence, 1.0);
    assert.ok(t2.reasoning.includes("feature/DEV-303-apple-pay"));
  });

  it("configures Gemini semantic analyzer with gemini-3.8-flash and falls back cleanly when offline", async () => {
    const analyzer = new GeminiSemanticDiffAnalyzer("mock_api_key", "gemini-3.8-flash");

    const task: TaskToVerify = {
      id: "t_gemini",
      key: "VAR-404",
      title: "Biometric FaceID Authentication Service",
      description: "Support iOS FaceID and Android BiometricPrompt local secure login",
      status: "In Progress",
    };

    const commits: CommitInfo[] = [
      {
        sha: "sha_bio_1",
        message: "add native biometric authentication wrapper",
        author: "Dev",
        date: new Date().toISOString(),
        diffSnippet: "+export async function authenticateWithBiometrics(faceId: boolean) { ... }",
      },
    ];

    const alignment = await analyzer.analyzeTaskCommitAlignment(task, commits);
    assert.strictEqual(alignment.isVerified, true);
    assert.ok(alignment.confidence >= 0.7);
    assert.ok(alignment.reasoning.includes("Biometric FaceID"));
    assert.strictEqual(alignment.matchedCommits.length, 1);
  });

  it("passes gemini-3.8-flash model without deprecated parameters to GoogleGenAI SDK in audit analyzer", async () => {
    let capturedParams: any;

    const fakeAi = {
      models: {
        async generateContent(params: any) {
          capturedParams = params;
          return {
            text: JSON.stringify({
              isVerified: true,
              confidence: 0.95,
              reasoning: "Verified via semantic code audit.",
              matchedShas: ["sha_live_1"],
            }),
          };
        },
      },
    };

    class TestAuditAnalyzer extends GeminiSemanticDiffAnalyzer {
      protected getAiClient(): any {
        return fakeAi;
      }
    }

    const analyzer = new TestAuditAnalyzer("live_key_for_test", "gemini-3.8-flash");
    const task: TaskToVerify = {
      id: "t_live_1",
      key: "VAR-500",
      title: "Apple Pay Integration",
      description: "One click payment",
      status: "Done",
    };
    const commits: CommitInfo[] = [
      {
        sha: "sha_live_1",
        message: "feat: apple pay payment sheet implementation",
        author: "Dev",
        date: new Date().toISOString(),
      },
    ];

    const result = await analyzer.analyzeTaskCommitAlignment(task, commits);
    assert.ok(capturedParams);
    assert.strictEqual(capturedParams.model, "gemini-3.8-flash");
    assert.strictEqual(capturedParams.config.responseMimeType, "application/json");
    assert.strictEqual(capturedParams.config.temperature, undefined);
    assert.strictEqual(result.isVerified, true);
    assert.strictEqual(result.matchedCommits.length, 1);
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

  it("queries live Linear board status and detects Ghost Completions from live Linear issues", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const auditRepo = new InMemoryAuditRepository();

    const dev = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_dev_linear_audit",
        email: "dev@commitcheck.io",
      },
      "FREELANCER"
    );

    // Give dev Linear token
    await userRepo.updateLinearCredentials(dev.id, {
      linearAccessToken: "lin_test_token_123",
      linearWorkspaceId: "ws_linear_1",
      linearWorkspaceName: "Acme Software",
    });

    const project = await projectRepo.createProject(dev.id, {
      title: "Live Linear Audit Project",
      clientEmail: "client@clientcorp.com",
      githubRepoFullName: "dev/live-linear-audit",
    });

    // Mark project linked to Linear project
    await projectRepo.updateLinearProject(project.id, {
      linearProjectId: "lin_proj_12345",
      linearProjectUrl: "https://linear.app/acme/project/live-linear-audit",
    });

    // Linear task fetcher returns an issue that is marked "Done" on the board
    const linearFetcher = new MockLinearIssueFetcher([
      {
        id: "issue_done_ghost",
        key: "ACME-10",
        title: "Implement Biometric FaceID Flow",
        description: "Support local iOS FaceID authentication",
        status: "Done",
        statusType: "completed",
      },
      {
        id: "issue_in_prog",
        key: "ACME-11",
        title: "Configure Stripe Customer Portal",
        description: "Embed customer billing portal for subscription upgrades",
        status: "In Progress",
        statusType: "started",
      },
    ]);

    // Commits in GitHub do NOT contain any ACME-10 work
    const commitFetcher = new MockGitHubCommitFetcher([
      {
        sha: "sha_acme_11",
        message: "feat(ACME-11): configure stripe customer portal integration",
        author: "Dev",
        date: new Date().toISOString(),
      },
    ]);

    const auditResult = await runProjectAudit(
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
      auditRepo,
      linearFetcher
    );

    assert.strictEqual(auditResult.isCached, false);
    assert.strictEqual(auditResult.report.ghostCompletions, 1);
    assert.strictEqual(auditResult.report.verifiedPercentage, 50);

    const ghost = auditResult.report.discrepancies.find((d) => d.type === "GHOST_COMPLETION");
    assert.ok(ghost);
    assert.strictEqual(ghost.issueKey, "ACME-10");
    assert.strictEqual(ghost.severity, "HIGH");
  });

  it("LiveGitHubCommitFetcher throws GITHUB_VERIFICATION_UNAVAILABLE and never returns fallback commits when credentials are mock or offline", async () => {
    const fetcher = new LiveGitHubCommitFetcher();
    await assert.rejects(
      async () => {
        await fetcher.fetchRecentCommits("gh_mock_test_token", "owner/repo");
      },
      (err: any) => {
        assert.strictEqual(err.code, "GITHUB_VERIFICATION_UNAVAILABLE");
        assert.ok(err.message.includes("GitHub verification unavailable"));
        return true;
      }
    );

    const branches = await fetcher.fetchRepoBranches("gh_mock_test_token", "owner/repo");
    assert.deepStrictEqual(branches, []);
  });

  it("LiveLinearIssueFetcher transforms GraphQL project issues into verified task models", async () => {
    const mockLinearService = new MockLinearService();
    mockLinearService.projectIssues = [
      {
        id: "iss_live_1",
        identifier: "TEST-100",
        title: "Live Issue 100",
        description: "Live issue description",
        status: "Done",
        statusType: "completed",
        priority: 1,
        estimate: 3,
      },
    ];

    const fetcher = new LiveLinearIssueFetcher(mockLinearService);
    const tasks = await fetcher.fetchProjectTasks("lin_token_mock", "proj_123");
    assert.strictEqual(tasks.length, 1);
    assert.strictEqual(tasks[0].key, "TEST-100");
    assert.strictEqual(tasks[0].status, "Done");
    assert.strictEqual(tasks[0].statusType, "completed");
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

  it("does not count GitHub activity that existed before the project started (audit baseline boundary in runDualTierVerification)", async () => {
    const baselineDate = new Date("2026-10-21T10:00:00Z");

    const tasks: TaskToVerify[] = [
      {
        id: "t1",
        key: "VAR-101",
        title: "Implement Stripe Elements UI",
        description: "Embedded payment form with card validation",
        status: "Done",
        statusType: "completed",
      },
      {
        id: "t2",
        key: "VAR-102",
        title: "Build Receipt Webhook Endpoint",
        description: "Handle payment_intent.succeeded and dispatch receipts",
        status: "Backlog",
      },
    ];

    const commits: CommitInfo[] = [
      // Commit 1: Syntactically matches VAR-101, but existed BEFORE the project started
      {
        sha: "sha_pre_project_1",
        message: "feat(VAR-101): legacy stripe elements checkout form",
        author: "Old Dev",
        date: "2026-10-20T12:00:00Z", // 22 hours before baseline
      },
      // Commit 2: Semantically matches VAR-102, but existed BEFORE the project started
      {
        sha: "sha_pre_project_2",
        message: "setup webhook endpoint for payment receipt processing",
        author: "Old Dev",
        date: "2026-10-20T14:00:00Z", // 20 hours before baseline
        diffSnippet: "+ app.post('/webhook', handleReceipt)",
      },
      // Commit 3: Unrelated commit that existed BEFORE the project started
      {
        sha: "sha_pre_project_3",
        message: "refactor: old database setup from previous project",
        author: "Old Dev",
        date: "2026-10-20T16:00:00Z", // 18 hours before baseline
      },
      // Commit 4: Legit commit made AFTER the project started
      {
        sha: "sha_post_project_4",
        message: "feat(VAR-101): live project stripe elements implementation",
        author: "Current Dev",
        date: "2026-10-21T11:00:00Z", // 1 hour after baseline
      },
    ];

    const analyzer = new GeminiSemanticDiffAnalyzer();

    // 1. Run verification with baseline boundary
    const result = await runDualTierVerification({
      tasks,
      commits,
      analyzer,
      baselineDate,
    });

    // VAR-101 is verified ONLY by the commit made after baseline (sha_post_project_4)
    const t1 = result.verifiedTasks.find((t) => t.issueKey === "VAR-101");
    assert.ok(t1);
    assert.strictEqual(t1.isVerified, true);
    assert.strictEqual(t1.tier, "SYNTACTIC");
    assert.strictEqual(t1.matchedCommits.length, 1);
    assert.strictEqual(t1.matchedCommits[0].sha, "sha_post_project_4");

    // VAR-102 is NOT verified because sha_pre_project_2 occurred before project started
    const t2 = result.verifiedTasks.find((t) => t.issueKey === "VAR-102");
    assert.ok(t2);
    assert.strictEqual(t2.isVerified, false);
    assert.strictEqual(t2.tier, "NONE");

    // Untracked work must NOT count sha_pre_project_3 because it existed before project started
    assert.strictEqual(result.untrackedCommitsCount, 0);
    const untrackedDiscrepancies = result.discrepancies.filter((d) => d.type === "UNTRACKED_WORK");
    assert.strictEqual(untrackedDiscrepancies.length, 0);

    // 2. When ONLY pre-project commits exist, zero tasks are verified and no pre-project commits are flagged as untracked
    const preProjectOnlyCommits = commits.filter((c) => c.sha.startsWith("sha_pre_project"));
    const emptyProgressResult = await runDualTierVerification({
      tasks,
      commits: preProjectOnlyCommits,
      analyzer,
      baselineDate,
    });

    assert.strictEqual(emptyProgressResult.verifiedPercentage, 0);
    assert.strictEqual(emptyProgressResult.untrackedCommitsCount, 0);
    // Task 1 marked "Done" is flagged as Ghost Completion since no code was delivered since project started
    assert.strictEqual(emptyProgressResult.ghostCompletionsCount, 1);
    const ghost = emptyProgressResult.discrepancies.find((d) => d.type === "GHOST_COMPLETION");
    assert.ok(ghost);
    assert.strictEqual(ghost.issueKey, "VAR-101");
  });

  it("enforces project creation baseline in runProjectAudit and excludes pre-project GitHub activity", async () => {
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const auditRepo = new InMemoryAuditRepository();

    const dev = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_baseline_test_dev",
        email: "dev@baseline.io",
      },
      "FREELANCER"
    );

    const client = await userRepo.upsertOAuthUser(
      {
        provider: "google",
        providerId: "g_baseline_client",
        email: "client@baseline.io",
      },
      "CLIENT"
    );

    const project = await projectRepo.createProject(
      dev.id,
      {
        title: "Baseline Boundary Verification Project",
        clientEmail: "client@baseline.io",
        githubRepoFullName: "dev/baseline-repo",
      },
      client.id
    );

    // Override project.createdAt to simulate an established start time
    const projectStartTime = new Date("2026-10-21T09:00:00.000Z");
    (project as any).createdAt = projectStartTime;
    // Update repository record
    (projectRepo as any).projects.set(project.id, { ...project, createdAt: projectStartTime });

    await userRepo.updateLinearCredentials(dev.id, {
      linearAccessToken: "lin_test_token",
      linearWorkspaceId: "ws_1",
      linearWorkspaceName: "Test WS",
    });
    await projectRepo.updateLinearProject(project.id, { linearProjectId: "proj_lin_base" });

    // Tasks: 1 In Progress, 1 Done
    const mockLinearFetcher = new MockLinearIssueFetcher([
      {
        id: "t_base_1",
        key: "TASK-1",
        title: "Biometric Authentication Service",
        description: "Support iOS FaceID login",
        status: "In Progress",
        statusType: "started",
      },
      {
        id: "t_base_2",
        key: "TASK-2",
        title: "User Profile Management",
        description: "Settings screen",
        status: "Done",
        statusType: "completed",
      },
    ]);

    // Commits from GitHub: 2 from before project started, 1 from after
    const commitFetcher = new MockGitHubCommitFetcher([
      {
        sha: "old_sha_1",
        message: "feat: add biometric authentication service for face id login",
        author: "Dev",
        date: "2026-10-20T15:00:00.000Z", // Pre-project!
        diffSnippet: "+export async function authenticateWithBiometrics() { ... }",
      },
      {
        sha: "old_sha_2",
        message: "chore: random commit before project was created",
        author: "Dev",
        date: "2026-10-20T18:00:00.000Z", // Pre-project!
      },
      {
        sha: "new_sha_1",
        message: "feat: add biometric authentication service for face id login",
        author: "Dev",
        date: "2026-10-21T12:00:00.000Z", // After project start!
        diffSnippet: "+export async function authenticateWithBiometrics() { ... }",
      },
    ]);

    const auditResult = await runProjectAudit(
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
      auditRepo,
      mockLinearFetcher
    );

    const report = auditResult.report;
    assert.ok(report);

    // Only new_sha_1 was considered
    assert.strictEqual(report.latestCommitSha, "new_sha_1");

    // old_sha_2 is NOT counted as untracked work
    assert.strictEqual(report.untrackedCommits, 0);

    // "User Profile Management" is marked Done but has no commits since project started -> Ghost completion
    assert.strictEqual(report.ghostCompletions, 1);
    const ghost = report.discrepancies.find((d) => d.type === "GHOST_COMPLETION");
    assert.ok(ghost);
    assert.ok(ghost.title.includes("User Profile Management"));
  });

  describe("Audit Engine Regression Tests: Strict GitHub Verification & Zero Fallbacks", () => {
    it("Test 1 — GitHub unavailable: throws clear error, creates no AuditReport, no fake commits or percentages", async () => {
      const userRepo = new InMemoryUserRepository();
      const projectRepo = new InMemoryProjectRepository();
      const draftRepo = new InMemoryTaskDraftRepository();
      const auditRepo = new InMemoryAuditRepository();

      const dev = await userRepo.upsertOAuthUser(
        {
          provider: "github",
          providerId: "gh_real_dev_1",
          email: "realdev@corp.com",
          accessToken: "real_token_simulated_valid",
        },
        "FREELANCER"
      );

      const project = await projectRepo.createProject(dev.id, {
        title: "Unavailable Repo Project",
        clientEmail: "client@corp.com",
        githubRepoFullName: "nonexistent-org/nonexistent-repo-404",
      });

      // Use LiveGitHubCommitFetcher
      const liveFetcher = new LiveGitHubCommitFetcher();

      await assert.rejects(
        async () => {
          await runProjectAudit(
            {
              projectId: project.id,
              userId: dev.id,
              auditorRole: "FREELANCER_SELF_CHECK",
            },
            userRepo,
            projectRepo,
            draftRepo,
            liveFetcher,
            new GeminiSemanticDiffAnalyzer(),
            auditRepo
          );
        },
        (err: any) => {
          assert.strictEqual(err.code, "GITHUB_VERIFICATION_UNAVAILABLE");
          assert.ok(err.message.includes("GitHub verification unavailable"));
          return true;
        }
      );

      // Verify NO report was created
      const reports = await auditRepo.listReportsForProject(project.id);
      assert.strictEqual(reports.length, 0);
      const latest = await auditRepo.findLatestReportForProject(project.id);
      assert.strictEqual(latest, null);
    });

    it("Test 2 — Missing GitHub token: fails clearly with no fallback and creates no AuditReport", async () => {
      const userRepo = new InMemoryUserRepository();
      const projectRepo = new InMemoryProjectRepository();
      const draftRepo = new InMemoryTaskDraftRepository();
      const auditRepo = new InMemoryAuditRepository();

      const dev = await userRepo.upsertOAuthUser(
        {
          provider: "github",
          providerId: "gh_no_token",
          email: "notoken@corp.com",
          // No accessToken provided!
        },
        "FREELANCER"
      );

      const project = await projectRepo.createProject(dev.id, {
        title: "No Token Project",
        clientEmail: "client@corp.com",
        githubRepoFullName: "owner/repo",
      });

      const liveFetcher = new LiveGitHubCommitFetcher();

      await assert.rejects(
        async () => {
          await runProjectAudit(
            {
              projectId: project.id,
              userId: dev.id,
              auditorRole: "FREELANCER_SELF_CHECK",
            },
            userRepo,
            projectRepo,
            draftRepo,
            liveFetcher,
            new GeminiSemanticDiffAnalyzer(),
            auditRepo
          );
        },
        (err: any) => {
          assert.strictEqual(err.code, "GITHUB_VERIFICATION_UNAVAILABLE");
          assert.ok(err.message.includes("Missing or invalid GitHub credentials"));
          return true;
        }
      );

      const reports = await auditRepo.listReportsForProject(project.id);
      assert.strictEqual(reports.length, 0);
    });

    it("Test 3 — Invalid GitHub token: rejects placeholder/mock tokens in production path without fallback", async () => {
      const userRepo = new InMemoryUserRepository();
      const projectRepo = new InMemoryProjectRepository();
      const draftRepo = new InMemoryTaskDraftRepository();
      const auditRepo = new InMemoryAuditRepository();

      const dev = await userRepo.upsertOAuthUser(
        {
          provider: "github",
          providerId: "gh_fake_token",
          email: "faketoken@corp.com",
          accessToken: "mock_gh_token_dev_123", // placeholder token
        },
        "FREELANCER"
      );

      const project = await projectRepo.createProject(dev.id, {
        title: "Fake Token Project",
        clientEmail: "client@corp.com",
        githubRepoFullName: "owner/repo",
      });

      const liveFetcher = new LiveGitHubCommitFetcher();

      await assert.rejects(
        async () => {
          await runProjectAudit(
            {
              projectId: project.id,
              userId: dev.id,
              auditorRole: "FREELANCER_SELF_CHECK",
            },
            userRepo,
            projectRepo,
            draftRepo,
            liveFetcher,
            new GeminiSemanticDiffAnalyzer(),
            auditRepo
          );
        },
        (err: any) => {
          assert.strictEqual(err.code, "GITHUB_VERIFICATION_UNAVAILABLE");
          assert.ok(err.message.includes("Missing or invalid GitHub credentials"));
          return true;
        }
      );

      const reports = await auditRepo.listReportsForProject(project.id);
      assert.strictEqual(reports.length, 0);
    });

    it("Test 4 — Real GitHub data: audit succeeds when valid commit fetcher is provided", async () => {
      const userRepo = new InMemoryUserRepository();
      const projectRepo = new InMemoryProjectRepository();
      const draftRepo = new InMemoryTaskDraftRepository();
      const auditRepo = new InMemoryAuditRepository();

      const dev = await userRepo.upsertOAuthUser(
        {
          provider: "github",
          providerId: "gh_test4_dev",
          email: "dev@valid.io",
        },
        "FREELANCER"
      );

      const project = await projectRepo.createProject(dev.id, {
        title: "Valid Verification Project",
        clientEmail: "client@valid.io",
        githubRepoFullName: "owner/valid-repo",
      });

      await draftRepo.createTaskDraft({
        meetingId: "m1",
        projectId: project.id,
        title: "Build Order Checkout Flow",
        description: "Stripe checkout form",
        status: "SYNCED",
      });

      const explicitMockFetcher = new MockGitHubCommitFetcher([
        {
          sha: "sha_real_evidence_101",
          message: "feat(TASK-1): implement order checkout flow",
          author: "Dev",
          date: new Date().toISOString(),
        },
      ]);

      const result = await runProjectAudit(
        {
          projectId: project.id,
          userId: dev.id,
          auditorRole: "FREELANCER_SELF_CHECK",
        },
        userRepo,
        projectRepo,
        draftRepo,
        explicitMockFetcher,
        new GeminiSemanticDiffAnalyzer(),
        auditRepo
      );

      assert.ok(result.report);
      assert.strictEqual(result.report.verifiedPercentage, 100);
      assert.strictEqual(result.report.latestCommitSha, "sha_real_evidence_101");
      assert.strictEqual(result.report.verifiedTasks[0].isVerified, true);
    });

    it("Test 5 — Production path never silently falls back: LiveGitHubCommitFetcher never fabricates commits", async () => {
      const fetcher = new LiveGitHubCommitFetcher();

      // Test with missing token
      await assert.rejects(
        async () => {
          await fetcher.fetchRecentCommits("", "owner/repo");
        },
        { code: "GITHUB_VERIFICATION_UNAVAILABLE" }
      );

      // Test with placeholder token
      await assert.rejects(
        async () => {
          await fetcher.fetchRecentCommits("test-token", "owner/repo");
        },
        { code: "GITHUB_VERIFICATION_UNAVAILABLE" }
      );

      // Verify that no commit with fake sha e1f2a3b4c5d1001 is ever returned
      const branches = await fetcher.fetchRepoBranches("", "owner/repo");
      assert.deepStrictEqual(branches, []);
    });

    it("Test 6 — Baseline still works: pre-project commits remain excluded from audit calculation", async () => {
      const userRepo = new InMemoryUserRepository();
      const projectRepo = new InMemoryProjectRepository();
      const draftRepo = new InMemoryTaskDraftRepository();
      const auditRepo = new InMemoryAuditRepository();

      const dev = await userRepo.upsertOAuthUser(
        {
          provider: "github",
          providerId: "gh_test6_dev",
          email: "dev@test6.io",
        },
        "FREELANCER"
      );

      const projectStartTime = new Date("2026-10-21T10:00:00.000Z");
      const project = await projectRepo.createProject(dev.id, {
        title: "Baseline Exclusion Project",
        clientEmail: "client@test6.io",
        githubRepoFullName: "owner/repo",
      });
      (project as any).createdAt = projectStartTime;
      (projectRepo as any).projects.set(project.id, { ...project, createdAt: projectStartTime });

      await userRepo.updateLinearCredentials(dev.id, {
        linearAccessToken: "lin_test6_token",
        linearWorkspaceId: "ws_1",
        linearWorkspaceName: "Test WS",
      });
      await projectRepo.updateLinearProject(project.id, { linearProjectId: "proj_lin_test6" });

      const mockLinearFetcher = new MockLinearIssueFetcher([
        {
          id: "t_test6_1",
          key: "TASK-1",
          title: "Pre-project work test",
          description: "Should not match pre-project commit",
          status: "Done",
          statusType: "completed",
        },
      ]);

      const commitFetcher = new MockGitHubCommitFetcher([
        {
          sha: "sha_pre_baseline",
          message: "feat(TASK-1): pre baseline commit",
          author: "Dev",
          date: "2026-10-20T12:00:00.000Z", // 22h before project
        },
        {
          sha: "sha_post_baseline",
          message: "chore: post baseline maintenance",
          author: "Dev",
          date: "2026-10-21T14:00:00.000Z", // 4h after project
        },
      ]);

      const result = await runProjectAudit(
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
        auditRepo,
        mockLinearFetcher
      );

      // sha_pre_baseline was completely excluded
      assert.strictEqual(result.report.latestCommitSha, "sha_post_baseline");
      const task = result.report.verifiedTasks.find((t) => t.title.includes("Pre-project"));
      assert.ok(task);
      assert.strictEqual(task.isVerified, false);
      // Because task is SYNCED (Done) but has no valid commit since baseline, it's flagged as ghost completion
      assert.strictEqual(result.report.ghostCompletions, 1);
    });

    it("Test 7 — Cache: valid real reports still use 10-minute cache and ignore fallback reports", async () => {
      const userRepo = new InMemoryUserRepository();
      const projectRepo = new InMemoryProjectRepository();
      const draftRepo = new InMemoryTaskDraftRepository();
      const auditRepo = new InMemoryAuditRepository();

      const dev = await userRepo.upsertOAuthUser(
        {
          provider: "github",
          providerId: "gh_test7_dev",
          email: "dev@test7.io",
        },
        "FREELANCER"
      );

      const project = await projectRepo.createProject(dev.id, {
        title: "Cache Retention Project",
        clientEmail: "client@test7.io",
        githubRepoFullName: "owner/repo",
      });

      const commitFetcher = new MockGitHubCommitFetcher([
        {
          sha: "sha_cache_test_001",
          message: "feat: initial real work",
          author: "Dev",
          date: new Date().toISOString(),
        },
      ]);

      // 1. First run creates report
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

      // 2. Second run within 10 min uses cache
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
    });

    it("Test 8 — Force refresh: force: true bypasses the cache", async () => {
      const userRepo = new InMemoryUserRepository();
      const projectRepo = new InMemoryProjectRepository();
      const draftRepo = new InMemoryTaskDraftRepository();
      const auditRepo = new InMemoryAuditRepository();

      const dev = await userRepo.upsertOAuthUser(
        {
          provider: "github",
          providerId: "gh_test8_dev",
          email: "dev@test8.io",
        },
        "FREELANCER"
      );

      const project = await projectRepo.createProject(dev.id, {
        title: "Force Refresh Project",
        clientEmail: "client@test8.io",
        githubRepoFullName: "owner/repo",
      });

      const commitFetcher = new MockGitHubCommitFetcher([
        {
          sha: "sha_force_test_001",
          message: "feat: work in progress",
          author: "Dev",
          date: new Date().toISOString(),
        },
      ]);

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

      const run2 = await runProjectAudit(
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
      assert.strictEqual(run2.isCached, false);
    });
  });

  describe("Audit Performance Optimizations & Controlled Concurrency Guardrails", () => {
    it("enforces controlled concurrency of 3 for Tier 2 Gemini calls", async () => {
      let currentConcurrency = 0;
      let maxObservedConcurrency = 0;

      class ConcurrencyTrackingAnalyzer extends GeminiSemanticDiffAnalyzer {
        async analyzeTaskCommitAlignment(task: any, commits: any) {
          currentConcurrency++;
          if (currentConcurrency > maxObservedConcurrency) {
            maxObservedConcurrency = currentConcurrency;
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
          currentConcurrency--;
          return {
            isVerified: false,
            confidence: 0,
            reasoning: "Tested concurrency",
            matchedCommits: [],
          };
        }
      }

      const tasks: TaskToVerify[] = Array.from({ length: 9 }, (_, i) => ({
        id: `t_${i}`,
        key: `TASK-${i + 1}`,
        title: `Deliverable ${i + 1}`,
        description: `Description ${i + 1}`,
        status: "In Progress",
      }));

      const commits: CommitInfo[] = [
        {
          sha: "sha_dummy_1",
          message: "general commit without keys",
          author: "Dev",
          date: new Date().toISOString(),
        },
      ];

      const tracker = new ConcurrencyTrackingAnalyzer();
      await runDualTierVerification({
        tasks,
        commits,
        analyzer: tracker,
      });

      assert.ok(maxObservedConcurrency <= 3, `Max concurrency exceeded limit of 3: observed ${maxObservedConcurrency}`);
      assert.ok(maxObservedConcurrency >= 1, "Concurrency tracker executed");
    });

    it("preserves exact task ordering in verifiedTasks after concurrent Tier 2 processing", async () => {
      class VariableDelayAnalyzer extends GeminiSemanticDiffAnalyzer {
        async analyzeTaskCommitAlignment(task: any) {
          // Delay earlier tasks longer to test ordering integrity
          const delay = task.key === "TASK-1" ? 30 : 5;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return {
            isVerified: task.key === "TASK-2",
            confidence: 0.9,
            reasoning: `Analysis for ${task.key}`,
            matchedCommits: [],
          };
        }
      }

      const tasks: TaskToVerify[] = [
        { id: "1", key: "TASK-1", title: "First Task", description: "Desc 1", status: "Done" },
        { id: "2", key: "TASK-2", title: "Second Task", description: "Desc 2", status: "Done" },
        { id: "3", key: "TASK-3", title: "Third Task", description: "Desc 3", status: "Done" },
      ];

      const commits: CommitInfo[] = [
        { sha: "s1", message: "unrelated work", author: "Dev", date: new Date().toISOString() },
      ];

      const result = await runDualTierVerification({
        tasks,
        commits,
        analyzer: new VariableDelayAnalyzer(),
      });

      assert.strictEqual(result.verifiedTasks.length, 3);
      assert.strictEqual(result.verifiedTasks[0].issueKey, "TASK-1");
      assert.strictEqual(result.verifiedTasks[1].issueKey, "TASK-2");
      assert.strictEqual(result.verifiedTasks[2].issueKey, "TASK-3");
      assert.strictEqual(result.verifiedTasks[0].isVerified, false);
      assert.strictEqual(result.verifiedTasks[1].isVerified, true);
    });

    it("live Gemini failure or timeout treats task as unresolved and NEVER marks it verified", async () => {
      const fakeHangingAi = {
        models: {
          async generateContent() {
            throw new Error("503 Model Overloaded / Connection timed out");
          },
        },
      };

      class FailingLiveAnalyzer extends GeminiSemanticDiffAnalyzer {
        protected getAiClient(): any {
          return fakeHangingAi;
        }
      }

      // Use a live-format key (not mock_ or test_key)
      const analyzer = new FailingLiveAnalyzer("live_actual_key_12345");
      const result = await analyzer.analyzeTaskCommitAlignment(
        {
          id: "t_fail",
          key: "VAR-999",
          title: "Critical Auth Gateway",
          description: "OAuth integration and session handling",
          status: "Done",
        },
        [
          {
            sha: "sha_fail_1",
            message: "add oauth session handling and critical auth gateway",
            author: "Dev",
            date: new Date().toISOString(),
          },
        ]
      );

      // Must remain UNVERIFIED / UNRESOLVED
      assert.strictEqual(result.isVerified, false);
      assert.strictEqual(result.confidence, 0);
      assert.ok(result.reasoning.includes("Semantic diff analysis unavailable"));
      assert.strictEqual(result.matchedCommits.length, 0);
    });

    it("one Gemini failure or timeout does not fail the overall audit", async () => {
      class PartialFailAnalyzer extends GeminiSemanticDiffAnalyzer {
        async analyzeTaskCommitAlignment(task: any) {
          if (task.key === "TASK-FAIL") {
            throw new Error("Simulated timeout/hang failure");
          }
          return {
            isVerified: true,
            confidence: 0.9,
            reasoning: `Verified ${task.key}`,
            matchedCommits: [],
          };
        }
      }

      const tasks: TaskToVerify[] = [
        { id: "1", key: "TASK-OK-1", title: "Good Task 1", description: "Desc", status: "Done" },
        { id: "2", key: "TASK-FAIL", title: "Failing Task", description: "Desc", status: "Done" },
        { id: "3", key: "TASK-OK-2", title: "Good Task 2", description: "Desc", status: "Done" },
      ];

      const commits: CommitInfo[] = [
        { sha: "s1", message: "general commit", author: "Dev", date: new Date().toISOString() },
      ];

      const result = await runDualTierVerification({
        tasks,
        commits,
        analyzer: new PartialFailAnalyzer(),
      });

      assert.strictEqual(result.verifiedTasks.length, 3);
      assert.strictEqual(result.verifiedTasks[0].isVerified, true);
      assert.strictEqual(result.verifiedTasks[1].isVerified, false);
      assert.strictEqual(result.verifiedTasks[2].isVerified, true);
      assert.ok(result.verifiedTasks[1].reasoning.includes("Semantic diff analysis unavailable"));
    });
  });

  describe("Audit Scope & Linear Status Integrity Guardrails", () => {
    let userRepo: InMemoryUserRepository;
    let projectRepo: InMemoryProjectRepository;
    let draftRepo: InMemoryTaskDraftRepository;
    let auditRepo: InMemoryAuditRepository;
    let commitFetcher: MockGitHubCommitFetcher;

    beforeEach(() => {
      userRepo = new InMemoryUserRepository();
      projectRepo = new InMemoryProjectRepository();
      draftRepo = new InMemoryTaskDraftRepository();
      auditRepo = new InMemoryAuditRepository();
      commitFetcher = new MockGitHubCommitFetcher();
    });

    it("SYNCED draft can NEVER become completed or trigger Ghost Completion", async () => {
      const dev = await userRepo.upsertOAuthUser(
        { provider: "github", providerId: "gh_dev_1", email: "dev1@example.com" },
        "FREELANCER"
      );
      const project = await projectRepo.createProject(dev.id, {
        title: "Test Sync Fallback",
        clientEmail: "client@test1.io",
        githubRepoFullName: "dev1/test-repo",
      });

      // Add a SYNCED draft
      const draft = await draftRepo.createTaskDraft({
        meetingId: "m1",
        projectId: project.id,
        title: "User Auth",
        description: "Implement Auth",
        status: "SYNCED",
        clientApprovalStatus: "NOT_REQUIRED",
        classification: "EXPLICIT",
      });
      await draftRepo.updateTaskDraft(draft.id, { linearIssueKey: "VAR-22" });

      const result = await runProjectAudit(
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

      const tasks = result.report.verifiedTasks;
      assert.strictEqual(tasks.length, 1);
      assert.notStrictEqual(tasks[0].status.toLowerCase(), "done");
      assert.notStrictEqual(tasks[0].status.toLowerCase(), "completed");
      assert.strictEqual(result.report.ghostCompletions, 0);
    });

    it("Linear Backlog cannot become Ghost Completion", async () => {
      const tasks: TaskToVerify[] = [
        { id: "1", key: "VAR-22", title: "Task 1", description: "Desc", status: "Backlog", statusType: "backlog" },
      ];
      const result = await runDualTierVerification({
        tasks,
        commits: [], // no commits
        analyzer: new GeminiSemanticDiffAnalyzer(),
      });
      assert.strictEqual(result.ghostCompletionsCount, 0);
      assert.strictEqual(result.discrepancies.filter((d) => d.type === "GHOST_COMPLETION").length, 0);
    });

    it("Linear Todo cannot become Ghost Completion", async () => {
      const tasks: TaskToVerify[] = [
        { id: "1", key: "VAR-22", title: "Task 1", description: "Desc", status: "Todo", statusType: "unstarted" },
      ];
      const result = await runDualTierVerification({
        tasks,
        commits: [], // no commits
        analyzer: new GeminiSemanticDiffAnalyzer(),
      });
      assert.strictEqual(result.ghostCompletionsCount, 0);
      assert.strictEqual(result.discrepancies.filter((d) => d.type === "GHOST_COMPLETION").length, 0);
    });

    it("Linear In Progress cannot become Ghost Completion", async () => {
      const tasks: TaskToVerify[] = [
        { id: "1", key: "VAR-22", title: "Task 1", description: "Desc", status: "In Progress", statusType: "started" },
      ];
      const result = await runDualTierVerification({
        tasks,
        commits: [], // no commits
        analyzer: new GeminiSemanticDiffAnalyzer(),
      });
      assert.strictEqual(result.ghostCompletionsCount, 0);
      assert.strictEqual(result.discrepancies.filter((d) => d.type === "GHOST_COMPLETION").length, 0);
    });

    it("Linear Done + no GitHub evidence DOES become Ghost Completion", async () => {
      const tasks: TaskToVerify[] = [
        { id: "1", key: "VAR-22", title: "Task 1", description: "Desc", status: "Done", statusType: "completed" },
      ];
      const result = await runDualTierVerification({
        tasks,
        commits: [], // no commits
        analyzer: new GeminiSemanticDiffAnalyzer(),
      });
      assert.strictEqual(result.ghostCompletionsCount, 1);
      const ghost = result.discrepancies.find((d) => d.type === "GHOST_COMPLETION");
      assert.ok(ghost);
      assert.strictEqual(ghost?.issueKey, "VAR-22");
    });

    it("401 → refresh → retry successfully uses fresh Linear status", async () => {
      const dev = await userRepo.upsertOAuthUser(
        { provider: "github", providerId: "gh_dev_401", email: "dev401@example.com" },
        "FREELANCER"
      );
      await userRepo.updateLinearCredentials(dev.id, {
        linearAccessToken: "lin_expired_token",
        linearRefreshToken: "lin_valid_refresh_token",
        linearWorkspaceId: "ws_1",
        linearWorkspaceName: "Test WS",
      });

      const project = await projectRepo.createProject(dev.id, {
        title: "Test Refresh Project",
        clientEmail: "client@dev401.io",
        githubRepoFullName: "dev401/test-repo",
      });
      await projectRepo.updateLinearProject(project.id, {
        linearProjectId: "proj_lin_123",
      });

      let fetchCount = 0;
      const mockLinearFetcher: LinearIssueFetcher = {
        async fetchProjectTasks(token: string, _projId: string) {
          fetchCount++;
          if (token === "lin_expired_token") {
            throw new Error("Linear API request failed: Unauthorized (401)");
          }
          return [
            {
              id: "t1",
              key: "VAR-22",
              title: "Live Backlog Task",
              description: "Desc",
              status: "Backlog",
              statusType: "backlog",
            },
          ];
        },
      };

      const mockLinearService = new MockLinearService();

      const result = await runProjectAudit(
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
        auditRepo,
        mockLinearFetcher,
        mockLinearService
      );

      // Verify token refreshed and retried
      assert.strictEqual(fetchCount, 2);
      const updatedUser = await userRepo.findById(dev.id);
      assert.ok(updatedUser?.linearAccessToken?.startsWith("lin_refreshed_token_"));
      assert.strictEqual(result.report.ghostCompletions, 0);

      const tasks = result.report.verifiedTasks;
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].issueKey, "VAR-22");
      assert.strictEqual(tasks[0].status, "Backlog");
    });

    it("refresh failure does not fabricate completion or ghost completion", async () => {
      const dev = await userRepo.upsertOAuthUser(
        { provider: "github", providerId: "gh_dev_rfail", email: "rfail@example.com" },
        "FREELANCER"
      );
      await userRepo.updateLinearCredentials(dev.id, {
        linearAccessToken: "lin_expired_token",
        linearRefreshToken: "invalid_refresh_token",
        linearWorkspaceId: "ws_1",
        linearWorkspaceName: "Test WS",
      });

      const project = await projectRepo.createProject(dev.id, {
        title: "Test Refresh Fail",
        clientEmail: "client@rfail.io",
        githubRepoFullName: "rfail/test-repo",
      });
      await projectRepo.updateLinearProject(project.id, {
        linearProjectId: "proj_lin_rfail",
      });

      const d = await draftRepo.createTaskDraft({
        meetingId: "m1",
        projectId: project.id,
        title: "Scoped Task",
        description: "Desc",
        status: "SYNCED",
        clientApprovalStatus: "NOT_REQUIRED",
        classification: "EXPLICIT",
      });
      await draftRepo.updateTaskDraft(d.id, { linearIssueKey: "VAR-25" });

      const mockLinearFetcher: LinearIssueFetcher = {
        async fetchProjectTasks() {
          throw new Error("Linear API request failed: Unauthorized (401)");
        },
      };

      const mockLinearService = new MockLinearService();

      const result = await runProjectAudit(
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
        auditRepo,
        mockLinearFetcher,
        mockLinearService
      );

      assert.strictEqual(result.report.ghostCompletions, 0);
      const tasks = result.report.verifiedTasks;
      assert.strictEqual(tasks.length, 1);
      assert.notStrictEqual(tasks[0].status.toLowerCase(), "done");
    });

    it("duplicate/superseded drafts do not produce 14 deliverables", async () => {
      const dev = await userRepo.upsertOAuthUser(
        { provider: "github", providerId: "gh_dev_dup", email: "dup@example.com" },
        "FREELANCER"
      );
      const project = await projectRepo.createProject(dev.id, {
        title: "Test Duplication",
        clientEmail: "client@dup.io",
        githubRepoFullName: "dup/test-repo",
      });

      // Add 7 SYNCED drafts
      for (let i = 1; i <= 7; i++) {
        const d = await draftRepo.createTaskDraft({
          meetingId: "m1",
          projectId: project.id,
          title: `Explicit Task ${i}`,
          description: `Desc ${i}`,
          status: "SYNCED",
          clientApprovalStatus: "NOT_REQUIRED",
          classification: "EXPLICIT",
        });
        await draftRepo.updateTaskDraft(d.id, { linearIssueKey: `VAR-${20 + i}` });
      }

      // Add 7 unapproved drafts pending client review
      for (let i = 8; i <= 14; i++) {
        await draftRepo.createTaskDraft({
          meetingId: "m1",
          projectId: project.id,
          title: `Tentative Task ${i}`,
          description: `Desc ${i}`,
          status: "APPROVED",
          clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
          classification: "AI_INFERRED",
        });
      }

      const result = await runProjectAudit(
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

      const tasks = result.report.verifiedTasks;
      // Must be 7 active deliverables, NOT 14!
      assert.strictEqual(tasks.length, 7);
      assert.strictEqual(result.report.ghostCompletions, 0);
    });

    it("Gemini timeout still produces unresolved, not Ghost Completion by itself", async () => {
      class TimeoutAnalyzer extends GeminiSemanticDiffAnalyzer {
        async analyzeTaskCommitAlignment(
          task: TaskToVerify,
          commits: CommitInfo[]
        ): Promise<{ isVerified: boolean; confidence: number; reasoning: string; matchedCommits: CommitInfo[] }> {
          throw new Error("Google GenAI request timed out");
        }
      }

      const tasks: TaskToVerify[] = [
        {
          id: "t1",
          key: "VAR-22",
          title: "User Auth",
          description: "Desc",
          status: "Backlog",
          statusType: "backlog",
        },
      ];

      const commits: CommitInfo[] = [
        {
          sha: "sha_abc",
          message: "some work",
          author: "Dev",
          date: new Date().toISOString(),
        },
      ];

      const result = await runDualTierVerification({
        tasks,
        commits,
        analyzer: new TimeoutAnalyzer(),
      });

      assert.strictEqual(result.verifiedTasks.length, 1);
      assert.strictEqual(result.verifiedTasks[0].isVerified, false);
      assert.ok(result.verifiedTasks[0].reasoning.includes("Semantic diff analysis unavailable"));
      // Crucial: Must NOT be a ghost completion!
      assert.strictEqual(result.ghostCompletionsCount, 0);
      assert.strictEqual(result.discrepancies.filter((d) => d.type === "GHOST_COMPLETION").length, 0);
    });
  });
});
