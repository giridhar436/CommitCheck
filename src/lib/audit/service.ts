import { UserRepository } from "../auth/types";
import { ProjectRepository } from "../projects/types";
import { TaskDraftRepository } from "../scope/types";
import {
  AuditReportData,
  AuditRepository,
  AuditorRole,
  CommitInfo,
  GitHubCommitFetcher,
  LinearIssueFetcher,
  SemanticDiffAnalyzer,
  TaskToVerify,
} from "./types";
import {
  GeminiSemanticDiffAnalyzer,
  GitHubVerificationError,
  LiveGitHubCommitFetcher,
  LiveLinearIssueFetcher,
  isMockOrPlaceholderToken,
  runDualTierVerification,
} from "./engine";
import { defaultAuditRepository, isReportFromFallbackData } from "./adapter";
import { LinearService } from "../linear/types";
import { defaultLinearService } from "../linear";

export interface RunProjectAuditInput {
  projectId: string;
  userId: string;
  auditorRole: AuditorRole;
  forceRefresh?: boolean;
  baselineDate?: Date | string;
}

export async function runProjectAudit(
  input: RunProjectAuditInput,
  userRepo: UserRepository,
  projectRepo: ProjectRepository,
  draftRepo: TaskDraftRepository,
  commitFetcher: GitHubCommitFetcher = new LiveGitHubCommitFetcher(),
  analyzer: SemanticDiffAnalyzer = new GeminiSemanticDiffAnalyzer(),
  auditRepo: AuditRepository = defaultAuditRepository,
  linearFetcher: LinearIssueFetcher = new LiveLinearIssueFetcher(),
  linearService: LinearService = defaultLinearService
): Promise<{ report: AuditReportData; isCached: boolean }> {
  // 1. Verify user & permissions
  const user = await userRepo.findById(input.userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const project = await projectRepo.findProjectById(input.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  // Ensure user is either the project's freelancer or the designated client
  const isFreelancer = project.freelancerId === user.id;
  const isClient =
    project.clientId === user.id ||
    (project.clientEmail && project.clientEmail.toLowerCase() === user.email.toLowerCase());

  if (!isFreelancer && !isClient) {
    throw new Error("Unauthorized: You do not have permission to audit this project.");
  }

  // Retrieve the authenticated freelancer's GitHub access token
  const freelancer = isFreelancer
    ? user
    : await userRepo.findById(project.freelancerId);
  const githubAccessToken = freelancer?.githubAccessToken || user.githubAccessToken || "";

  if (!project.githubRepo) {
    throw new GitHubVerificationError(
      "GitHub verification unavailable: Project has no bound GitHub repository."
    );
  }

  // If using live GitHub fetcher, enforce presence of valid credentials
  if (commitFetcher instanceof LiveGitHubCommitFetcher) {
    if (!githubAccessToken || isMockOrPlaceholderToken(githubAccessToken)) {
      throw new GitHubVerificationError(
        "GitHub verification unavailable: Missing or invalid GitHub credentials for the connected project repository."
      );
    }
  }

  // Verify that the GitHub access token has access to the target repository
  if (commitFetcher.verifyRepoAccess) {
    const hasAccess = await commitFetcher.verifyRepoAccess(
      githubAccessToken,
      project.githubRepo
    );
    if (!hasAccess) {
      throw new GitHubVerificationError(
        `GitHub verification unavailable: Access denied or repository '${project.githubRepo}' not found.`
      );
    }
  }

  // Determine audit baseline boundary (project start date)
  const baselineDate = input.baselineDate
    ? new Date(input.baselineDate)
    : project.createdAt
    ? new Date(project.createdAt)
    : undefined;

  const sinceIso = baselineDate
    ? new Date(baselineDate.getTime() - 1000).toISOString().replace(/\.\d{3}Z$/, "Z")
    : undefined;

  // 2. Fetch recent commits and branches from GitHub (bounded by project start baseline)
  const rawCommits = await commitFetcher.fetchRecentCommits(
    githubAccessToken,
    project.githubRepo,
    30,
    sinceIso
  );

  const baselineTime = baselineDate ? baselineDate.getTime() : null;
  const commits =
    baselineTime !== null && !isNaN(baselineTime)
      ? rawCommits.filter((c) => {
          if (!c.date) return false;
          const commitTime = new Date(c.date).getTime();
          return !isNaN(commitTime) && commitTime >= (baselineTime - 1000);
        })
      : rawCommits;

  const repoBranches = commitFetcher.fetchRepoBranches
    ? await commitFetcher.fetchRepoBranches(githubAccessToken, project.githubRepo)
    : [];
  const latestCommitSha = commits[0]?.sha || null;

  // 3. 10-Minute SHA Cache Check
  if (!input.forceRefresh && latestCommitSha) {
    const latestReport = await auditRepo.findLatestReportForProject(project.id);
    if (
      latestReport &&
      latestReport.latestCommitSha === latestCommitSha &&
      !isReportFromFallbackData(latestReport)
    ) {
      const ageMs = Date.now() - latestReport.createdAt.getTime();
      const tenMinutesMs = 10 * 60 * 1000;
      if (ageMs < tenMinutesMs) {
        return { report: latestReport, isCached: true };
      }
    }
  }

  // 4. Gather tasks from Live Linear workspace and local scope drafts
  let tasksToVerify: TaskToVerify[] = [];

  // Check if project is linked to a Linear project
  const targetUser = freelancer || user;
  let linearToken = targetUser.linearAccessToken;
  const refreshToken = targetUser.linearRefreshToken;

  if (linearToken && project.linearProjectId) {
    try {
      const liveTasks = await linearFetcher.fetchProjectTasks(
        linearToken,
        project.linearProjectId
      );
      if (liveTasks && liveTasks.length > 0) {
        tasksToVerify = liveTasks;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isAuthError =
        errMsg.includes("401") ||
        errMsg.toLowerCase().includes("unauthorized") ||
        errMsg.toLowerCase().includes("authentication required") ||
        errMsg.toLowerCase().includes("authentication error");

      if (isAuthError && refreshToken) {
        console.warn(
          `[runProjectAudit] Linear access token expired/unauthorized. Attempting refresh for user ${targetUser.id}...`
        );
        try {
          const refreshed = await linearService.refreshToken(refreshToken);
          if (refreshed.access_token) {
            linearToken = refreshed.access_token;
            await userRepo.updateLinearCredentials(targetUser.id, {
              linearAccessToken: refreshed.access_token,
              linearRefreshToken: refreshed.refresh_token || refreshToken,
              linearWorkspaceId: targetUser.linearWorkspaceId,
              linearWorkspaceName: targetUser.linearWorkspaceName,
            });
            console.log(
              `[runProjectAudit] Linear OAuth token refreshed successfully. Retrying task fetch...`
            );
            const liveTasksAfterRefresh = await linearFetcher.fetchProjectTasks(
              linearToken,
              project.linearProjectId
            );
            if (liveTasksAfterRefresh && liveTasksAfterRefresh.length > 0) {
              tasksToVerify = liveTasksAfterRefresh;
            }
          }
        } catch (refreshErr: any) {
          console.warn(
            `[runProjectAudit] Linear token refresh failed: ${refreshErr?.message || refreshErr}. Live Linear status unavailable.`
          );
        }
      } else {
        console.warn(
          `[runProjectAudit] Failed to fetch Linear project tasks (${errMsg}). Live Linear status unavailable.`
        );
      }
    }
  }

  // Fallback or merge with local scope drafts
  const drafts = await draftRepo.listDraftsForProject(project.id);
  if (tasksToVerify.length === 0) {
    // When live Linear tasks are unavailable, only include active/committed deliverables.
    // Exclude drafts that are discarded, rejected, or unapproved tentative items pending client review.
    const activeDrafts = drafts.filter((d) => {
      if (d.status === "DISCARDED") return false;
      if (d.clientApprovalStatus === "CLIENT_REJECTED") return false;
      if (
        (d.classification === "AI_INFERRED" || d.classification === "TENTATIVE") &&
        d.clientApprovalStatus === "PENDING_CLIENT_APPROVAL"
      ) {
        return false;
      }
      return true;
    });

    tasksToVerify = activeDrafts.map((d, idx) => ({
      id: d.id,
      key: d.linearIssueKey || `TASK-${idx + 1}`,
      title: d.title,
      description: d.description,
      // Safe non-completed/unknown status representation:
      // Unknown Linear status must NEVER become Completed.
      status:
        d.status === "SYNCED"
          ? "Unconfirmed (Linear Sync Pending)"
          : d.status === "APPROVED"
          ? "Approved Scope"
          : "Draft",
      statusType: "unstarted", // Explicitly unstarted so it can NEVER be treated as completed or trigger Ghost Completion
      priority: d.priority,
      estimate: d.estimate,
    }));
  } else {
    // If live Linear tasks were fetched, enrich with any draft descriptions if missing
    for (const task of tasksToVerify) {
      const matchedDraft = drafts.find(
        (d) => d.linearIssueKey === task.key || d.title.toLowerCase() === task.title.toLowerCase()
      );
      if (matchedDraft && !task.description) {
        task.description = matchedDraft.description;
      }
    }
  }

  // If no tasks exist in DB or Linear, provide standard verification benchmark task
  if (tasksToVerify.length === 0) {
    tasksToVerify.push({
      id: "benchmark_1",
      key: "VAR-101",
      title: "Core Repository Setup & Scaffolding",
      description: "Initialize project structure and dependencies",
      status: "Done",
      statusType: "completed",
      priority: 2,
    });
  }

  // 5. Run Dual-Tier Verification Engine
  const verification = await runDualTierVerification({
    tasks: tasksToVerify,
    commits,
    analyzer,
    repoBranches,
    baselineDate,
  });

  // 6. Persist Immutable Audit Report Snapshot
  const savedReport = await auditRepo.createAuditReport({
    projectId: project.id,
    auditorRole: input.auditorRole,
    summary: verification.summary,
    verifiedPercentage: verification.verifiedPercentage,
    verifiedTasks: verification.verifiedTasks,
    discrepancies: verification.discrepancies,
    ghostCompletions: verification.ghostCompletionsCount,
    untrackedCommits: verification.untrackedCommitsCount,
    latestCommitSha,
    triggeredById: user.id,
  });

  return { report: savedReport, isCached: false };
}
