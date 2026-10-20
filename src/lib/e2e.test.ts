import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Authentication & Session
import { handleOAuthCallback, roleForProvider } from "./auth/service";
import { verifySessionToken } from "./auth/session";
import { InMemoryUserRepository } from "./auth/adapter";

// Projects & GitHub
import { createProjectService } from "./projects/service";
import { InMemoryProjectRepository } from "./projects/adapter";
import { GitHubService } from "./projects/types";

// Meetings & Recall.ai
import { dispatchMeetingBot, handleRecallWebhook } from "./meetings/service";
import { InMemoryMeetingRepository } from "./meetings/adapter";
import { MockMeetingBotService } from "./meetings/recall";

// Scope Extraction & Confirmation
import {
  triggerScopeExtraction,
  requestClientScopeConfirmation,
  confirmClientScopeItems,
} from "./scope/service";
import { InMemoryTaskDraftRepository } from "./scope/adapter";
import { LLMExtractionService } from "./scope/types";

// Linear Publishing & Resend Notifications
import { publishProjectToLinear } from "./linear/service";
import { MockLinearService } from "./linear/linear";
import { MockEmailService } from "./notifications/email";

// AI Verification & Audit Engine
import { runProjectAudit } from "./audit/service";
import { InMemoryAuditRepository } from "./audit/adapter";
import {
  CommitInfo,
  GitHubCommitFetcher,
  LinearIssueFetcher,
  SemanticDiffAnalyzer,
  TaskToVerify,
} from "./audit/types";

// Environment Diagnostics
import { validateEnvironment } from "./env";

describe("CommitCheck End-to-End Integration Suite (VAR-21)", () => {
  it("executes the complete meeting-to-code freelance verification lifecycle across all application seams", async () => {
    // =========================================================================
    // 1. SYSTEM SETUP & ADAPTER INITIALIZATION
    // =========================================================================
    const userRepo = new InMemoryUserRepository();
    const projectRepo = new InMemoryProjectRepository();
    const meetingRepo = new InMemoryMeetingRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const auditRepo = new InMemoryAuditRepository();

    const botService = new MockMeetingBotService();
    const linearService = new MockLinearService();
    const emailService = new MockEmailService();

    // Stub GitHub service for project creation validation
    const mockGitHubService: GitHubService = {
      async verifyRepositoryAccess(_token: string, repoFullName: string) {
        return repoFullName.includes("/");
      },
      async listUserRepositories(_token: string) {
        return [{
          id: 1,
          name: "fintech-core",
          fullName: "acme-corp/fintech-core",
          owner: "acme-corp",
          isPrivate: false,
          description: "Fintech payment core",
          defaultBranch: "main",
          htmlUrl: "https://github.com/acme-corp/fintech-core",
        }];
      },
    };

    // =========================================================================
    // 2. ONBOARDING & ROLE-ENFORCED DUAL AUTH
    // =========================================================================
    // Freelancer signs in with GitHub OAuth
    const freelancerAuth = await handleOAuthCallback(
      {
        provider: "github",
        providerId: "gh_freelancer_live_123",
        email: "alex.rivera@freelance.dev",
        name: "Alex Rivera",
        avatarUrl: "https://github.com/alexrivera.png",
      },
      userRepo
    );
    assert.equal(freelancerAuth.user.role, "FREELANCER");
    assert.equal(freelancerAuth.user.email, "alex.rivera@freelance.dev");
    assert.equal(freelancerAuth.redirectUrl, "/freelancer");

    // Client signs in with Google OAuth
    const clientAuth = await handleOAuthCallback(
      {
        provider: "google",
        providerId: "google_client_live_456",
        email: "elena.rostova@clientcorp.com",
        name: "Elena Rostova",
        avatarUrl: "https://lh3.googleusercontent.com/elena.png",
      },
      userRepo
    );
    assert.equal(clientAuth.user.role, "CLIENT");
    assert.equal(clientAuth.user.email, "elena.rostova@clientcorp.com");
    assert.equal(clientAuth.redirectUrl, "/client");

    // Verify session tokens
    const freelancerSession = await verifySessionToken(freelancerAuth.sessionToken);
    assert.ok(freelancerSession);
    assert.equal(freelancerSession?.role, "FREELANCER");

    const clientSession = await verifySessionToken(clientAuth.sessionToken);
    assert.ok(clientSession);
    assert.equal(clientSession?.role, "CLIENT");

    // Enforce role-provider mapping rule
    assert.equal(roleForProvider("github"), "FREELANCER");
    assert.equal(roleForProvider("google"), "CLIENT");

    // =========================================================================
    // 3. PROJECT CREATION & REPO BINDING
    // =========================================================================
    const project = await createProjectService(
      freelancerAuth.user.id,
      {
        title: "Acme Fintech Payment Core",
        description: "Mobile payment core with biometric authorization and Stripe settlement",
        clientEmail: clientAuth.user.email,
        githubRepoFullName: "acme-corp/fintech-core",
      },
      userRepo,
      projectRepo,
      mockGitHubService
    );

    assert.ok(project.id);
    assert.equal(project.clientId, clientAuth.user.id);
    assert.equal(project.githubRepoFullName, "acme-corp/fintech-core");

    // =========================================================================
    // 4. MEETING BOT DISPATCH & RECALL.AI WEBHOOK INGESTION
    // =========================================================================
    const meeting = await dispatchMeetingBot(
      project.id,
      "https://meet.google.com/xyz-uvwx-rst",
      freelancerAuth.user.id,
      userRepo,
      projectRepo,
      meetingRepo,
      botService
    );

    assert.ok(meeting.id);
    assert.equal(meeting.status, "JOINING");
    assert.ok(meeting.recallBotId);

    // Simulate Recall.ai bot joining the call
    const statusPayload = {
      event: "bot.status_change",
      data: {
        bot_id: meeting.recallBotId,
        status: { code: "in_call_recording" },
      },
    };
    await handleRecallWebhook(
      statusPayload,
      {},
      JSON.stringify(statusPayload),
      meetingRepo,
      botService
    );

    const donePayload = {
      event: "transcript.done",
      data: {
        bot_id: meeting.recallBotId,
        transcript: [
          {
            speaker: "Elena (Client)",
            words: "We explicitly need biometric FaceID login and Stripe Payment Intent processing.",
            start_time: 1.0,
            end_time: 4.5,
          },
          {
            speaker: "Alex (Freelancer)",
            words: "I promise I will deliver the biometric FaceID authentication module by Friday.",
            start_time: 5.0,
            end_time: 8.5,
          },
          {
            speaker: "Alex (Freelancer)",
            words: "We should also include a secure PIN code fallback if FaceID fails.",
            start_time: 9.0,
            end_time: 12.0,
          },
          {
            speaker: "Elena (Client)",
            words: "Maybe we could also explore cryptocurrency payouts in the future, if feasible.",
            start_time: 13.0,
            end_time: 17.0,
          },
        ],
      },
    };

    await handleRecallWebhook(
      donePayload,
      {},
      JSON.stringify(donePayload),
      meetingRepo,
      botService
    );

    const savedMeeting = await meetingRepo.findMeetingById(meeting.id);
    assert.equal(savedMeeting?.status, "COMPLETED");
    assert.ok(savedMeeting?.transcript?.includes("biometric FaceID"));

    // =========================================================================
    // 5. 4-TIER AI SCOPE CLASSIFICATION & STAGING
    // =========================================================================
    const mockExtractor: LLMExtractionService = {
      async analyzeTranscript(transcript: string) {
        assert.ok(transcript.length > 0);
        return {
          summary: "Acme Fintech Payment Core Kickoff",
          explicitRequirements: [
            {
              title: "Implement Biometric FaceID Login",
              description: "Native FaceID authentication with keychain security",
              priority: 1,
              estimate: 5,
              classification: "EXPLICIT",
              confidence: 0.98,
              evidence: "We explicitly need biometric FaceID login",
            },
          ],
          confirmedCommitments: [
            {
              title: "Deliver Biometric Auth Module by Friday",
              description: "Hard milestone commitment from freelancer",
              priority: 1,
              estimate: 3,
              classification: "CONFIRMED_COMMITMENT",
              confidence: 0.95,
              evidence: "I promise I will deliver the biometric FaceID authentication module by Friday",
            },
          ],
          aiInferredRequirements: [
            {
              title: "Provide Secure PIN Code Fallback",
              description: "Local PIN fallback when biometric sensor fails",
              priority: 2,
              estimate: 3,
              classification: "AI_INFERRED",
              confidence: 0.88,
              evidence: "We should also include a secure PIN code fallback",
            },
          ],
          tentativeRequirements: [
            {
              title: "Explore Cryptocurrency Payouts",
              description: "Alternative payout rails for crypto wallets",
              priority: 4,
              estimate: 8,
              classification: "TENTATIVE",
              confidence: 0.65,
              evidence: "Maybe we could also explore cryptocurrency payouts",
            },
          ],
        };
      },
      async extractTasksFromTranscript(_t: string) {
        return [];
      },
    };

    const drafts = await triggerScopeExtraction(
      meeting.id,
      freelancerAuth.user.id,
      userRepo,
      meetingRepo,
      projectRepo,
      draftRepo,
      mockExtractor
    );

    assert.equal(drafts.length, 4);

    // Verify 4-tier classification states
    const explicitDraft = drafts.find((d) => d.classification === "EXPLICIT");
    const commitmentDraft = drafts.find((d) => d.classification === "CONFIRMED_COMMITMENT");
    const inferredDraft = drafts.find((d) => d.classification === "AI_INFERRED");
    const tentativeDraft = drafts.find((d) => d.classification === "TENTATIVE");

    assert.ok(explicitDraft);
    assert.equal(explicitDraft.clientApprovalStatus, "NOT_REQUIRED");
    assert.equal(explicitDraft.status, "DRAFT");

    assert.ok(commitmentDraft);
    assert.equal(commitmentDraft.clientApprovalStatus, "NOT_REQUIRED");
    assert.equal(commitmentDraft.status, "DRAFT");

    assert.ok(inferredDraft);
    assert.equal(inferredDraft.clientApprovalStatus, "PENDING_CLIENT_APPROVAL");
    assert.equal(inferredDraft.status, "DRAFT");

    assert.ok(tentativeDraft);
    assert.equal(tentativeDraft.clientApprovalStatus, "PENDING_CLIENT_APPROVAL");
    assert.equal(tentativeDraft.status, "DRAFT");

    // =========================================================================
    // 6. RESEND CLIENT SCOPE CONFIRMATION LOOP & PORTAL
    // =========================================================================
    const confirmationReq = await requestClientScopeConfirmation(
      project.id,
      freelancerAuth.user.id,
      userRepo,
      projectRepo,
      draftRepo,
      emailService
    );

    assert.equal(confirmationReq.requestedCount, 2); // inferred + tentative
    assert.equal(emailService.confirmationEmails.length, 1);
    assert.equal(emailService.confirmationEmails[0].to, clientAuth.user.email);
    assert.ok(emailService.confirmationEmails[0].projectName.length > 0);

    // Client confirms the inferred PIN fallback, rejects the tentative crypto payouts
    const clientDecision = await confirmClientScopeItems(
      project.id,
      clientAuth.user.id,
      [
        { draftId: inferredDraft.id, approved: true },
        { draftId: tentativeDraft.id, approved: false },
      ],
      userRepo,
      projectRepo,
      draftRepo,
      linearService
    );

    assert.equal(clientDecision.updatedDrafts.length, 2);

    const updatedInferred = await draftRepo.findDraftById(inferredDraft.id);
    assert.equal(updatedInferred?.clientApprovalStatus, "CLIENT_APPROVED");
    assert.equal(updatedInferred?.status, "APPROVED");

    const updatedTentative = await draftRepo.findDraftById(tentativeDraft.id);
    assert.equal(updatedTentative?.clientApprovalStatus, "CLIENT_REJECTED");
    assert.equal(updatedTentative?.status, "DISCARDED");

    // =========================================================================
    // 7. LINEAR WORKSPACE SYNC & PROJECT PUBLISHING
    // =========================================================================
    // Freelancer connects Linear workspace
    await userRepo.updateLinearCredentials(freelancerAuth.user.id, {
      linearAccessToken: "lin_token_freelancer_live",
      linearRefreshToken: "lin_refresh_freelancer_live",
      linearWorkspaceId: "ws_commitcheck_demo",
      linearWorkspaceName: "CommitCheck Engineering",
    });

    const publishResult = await publishProjectToLinear(
      {
        freelancerId: freelancerAuth.user.id,
        projectId: project.id,
        teamId: "team_eng_1",
      },
      userRepo,
      projectRepo,
      draftRepo,
      linearService,
      emailService
    );

    assert.equal(publishResult.publishedIssuesCount, 3); // 2 explicit/commitment + 1 client-confirmed (rejected excluded)
    assert.ok(publishResult.linearProjectId);

    // Stakeholder notification email sent after publish
    assert.ok(emailService.sentEmails.length >= 1);
    const publishEmail = emailService.sentEmails.find((e) =>
      e.projectName === project.title
    );
    assert.ok(publishEmail);

    // =========================================================================
    // 8. SCOPE ADDENDUM: FOLLOW-UP MEETING AUTO-SYNC TO LINEAR
    // =========================================================================
    // A follow-up meeting introduces a new scope item after Linear publishing
    const addendumMeeting = await meetingRepo.createMeeting(
      project.id,
      "https://meet.google.com/addendum-123",
      "bot_addendum_123",
      "COMPLETED"
    );
    await meetingRepo.updateMeetingStatus(
      addendumMeeting.id,
      "COMPLETED",
      "Client and Freelancer agreed to add multi-currency exchange support."
    );

    // Configure project with linearTeamId so addendum knows where to create issues
    await projectRepo.updateLinearProject(project.id, {
      linearProjectId: publishResult.linearProjectId,
      linearProjectUrl: publishResult.linearProjectUrl,
      linearTeamId: "team_eng_1",
    });

    const addendumDraft = await draftRepo.createTaskDraft({
      meetingId: addendumMeeting.id,
      projectId: project.id,
      title: "Add Multi-Currency Exchange Support",
      description: "Support EUR and GBP conversions in addition to USD",
      priority: 2,
      estimate: 3,
      classification: "AI_INFERRED",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      status: "DRAFT",
    });

    // Client confirms the addendum draft
    const addendumDecision = await confirmClientScopeItems(
      project.id,
      clientAuth.user.id,
      [{ draftId: addendumDraft.id, approved: true }],
      userRepo,
      projectRepo,
      draftRepo,
      linearService
    );

    assert.equal(addendumDecision.updatedDrafts.length, 1);
    assert.equal(addendumDecision.autoSyncedCount, 1); // Auto-synced as Scope Addendum to Linear!

    // =========================================================================
    // 9. DUAL-TIER AI VERIFICATION & AUDIT ENGINE
    // =========================================================================
    // Setup Linear issue fetcher reflecting live board state
    const linearFetcher: LinearIssueFetcher = {
      async fetchProjectTasks(_accessToken: string, _linearProjectId: string) {
        return [
          {
            id: "lin_task_1",
            key: "DEV-101",
            title: "Implement Biometric FaceID Login",
            description: "Native FaceID authentication with keychain security",
            status: "Done",
            statusType: "completed",
            priority: 1,
            estimate: 5,
          },
          {
            id: "lin_task_2",
            key: "DEV-102",
            title: "Deliver Biometric Auth Module by Friday",
            description: "Hard milestone commitment from freelancer",
            status: "Done",
            statusType: "completed",
            priority: 1,
            estimate: 3,
          },
          {
            id: "lin_task_3",
            key: "DEV-103",
            title: "Provide Secure PIN Code Fallback",
            description: "Local PIN fallback when biometric sensor fails",
            status: "Done", // Marked "Done" on board but freelancer NEVER committed code -> GHOST COMPLETION!
            statusType: "completed",
            priority: 2,
            estimate: 3,
          },
          {
            id: "lin_task_4",
            key: "DEV-104",
            title: "Add Multi-Currency Exchange Support",
            description: "Support EUR and GBP conversions in addition to USD",
            status: "In Progress",
            statusType: "started",
            priority: 2,
            estimate: 3,
          },
        ];
      },
    };

    // Setup GitHub commits
    const commitFetcher: GitHubCommitFetcher = {
      async fetchRecentCommits(_accessToken: string, _repoFullName: string, _limit?: number) {
        return [
          {
            sha: "sha_faceid_101",
            message: "feat(DEV-101): implement FaceID login with local biometric authentication",
            author: "Alex Dev",
            date: new Date().toISOString(),
            diffSnippet: "+ export async function authenticateFaceId() { return LocalAuthentication.authenticateAsync(); }",
          },
          {
            sha: "sha_milestone_102",
            message: "feat(DEV-102): finalize biometric auth milestone module",
            author: "Alex Dev",
            date: new Date().toISOString(),
            diffSnippet: "+ export const BIOMETRIC_MODULE_VERSION = '1.0.0';",
          },
          {
            sha: "sha_untracked_999",
            message: "chore: random experimental database script",
            author: "Alex Dev",
            date: new Date().toISOString(),
            diffSnippet: "+ const experimental = true;",
          },
          // Notice: zero commits for DEV-103!
        ];
      },
      async fetchRepoBranches(_accessToken: string, _repoFullName: string) {
        return ["main", "feature/DEV-101-faceid"];
      },
    };

    // Semantic diff analyzer
    const semanticAnalyzer: SemanticDiffAnalyzer = {
      async analyzeTaskCommitAlignment(task: TaskToVerify, commits: CommitInfo[]) {
        const matchingCommit = commits.find((c) =>
          c.message.toLowerCase().includes(task.title.toLowerCase().slice(0, 15)) ||
          c.message.includes(task.key || "")
        );
        if (matchingCommit) {
          return {
            isVerified: true,
            confidence: 0.95,
            reasoning: `Verified by commit ${matchingCommit.sha}`,
            matchedCommits: [matchingCommit],
          };
        }
        return {
          isVerified: false,
          confidence: 0.9,
          reasoning: `No matching implementation code found for ${task.title}`,
          matchedCommits: [],
        };
      },
    };

    // Client triggers audit
    const auditResult = await runProjectAudit(
      {
        projectId: project.id,
        userId: clientAuth.user.id,
        auditorRole: "CLIENT",
      },
      userRepo,
      projectRepo,
      draftRepo,
      commitFetcher,
      semanticAnalyzer,
      auditRepo,
      linearFetcher
    );

    const auditReport = auditResult.report;
    assert.ok(auditReport.id);
    assert.equal(auditReport.auditorRole, "CLIENT");

    // Check discrepancy detection
    // DEV-101 & DEV-102 are verified
    assert.ok(auditReport.verifiedTasks.length >= 2);

    // DEV-103 is flagged as a GHOST COMPLETION
    const ghostDiscrepancy = auditReport.discrepancies.find(
      (d) => d.type === "GHOST_COMPLETION" || d.title.includes("Ghost") || d.description.includes("DEV-103")
    );
    assert.ok(ghostDiscrepancy, "Must flag DEV-103 as a Ghost Completion");

    // sha_untracked_999 is flagged as UNTRACKED_WORK
    const untrackedDiscrepancy = auditReport.discrepancies.find(
      (d) => d.type === "UNTRACKED_WORK" || d.title.includes("Untracked") || d.description.includes("sha_untracked")
    );
    assert.ok(untrackedDiscrepancy, "Must flag untracked commit");

    // Verified progress percentage accurately calculated
    assert.ok(auditReport.verifiedPercentage > 0 && auditReport.verifiedPercentage < 100);

    // =========================================================================
    // 10. ENVIRONMENT DIAGNOSTICS SEAM
    // =========================================================================
    const envReport = validateEnvironment();
    assert.ok(envReport.timestamp);
    assert.ok(typeof envReport.isReadyForTesting === "boolean");
    assert.ok(typeof envReport.liveServicesCount === "number");
    assert.ok(typeof envReport.mockServicesCount === "number");
  });
});
