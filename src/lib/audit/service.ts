import { UserRepository } from "../auth/types";
import { ProjectRepository } from "../projects/types";
import { TaskDraftRepository } from "../scope/types";
import {
  AuditReportData,
  AuditRepository,
  AuditorRole,
  CommitInfo,
  GitHubCommitFetcher,
  SemanticDiffAnalyzer,
  TaskToVerify,
} from "./types";
import {
  GeminiSemanticDiffAnalyzer,
  LiveGitHubCommitFetcher,
  runDualTierVerification,
} from "./engine";
import { defaultAuditRepository } from "./adapter";

export interface RunProjectAuditInput {
  projectId: string;
  userId: string;
  auditorRole: AuditorRole;
  forceRefresh?: boolean;
}

export async function runProjectAudit(
  input: RunProjectAuditInput,
  userRepo: UserRepository,
  projectRepo: ProjectRepository,
  draftRepo: TaskDraftRepository,
  commitFetcher: GitHubCommitFetcher = new LiveGitHubCommitFetcher(),
  analyzer: SemanticDiffAnalyzer = new GeminiSemanticDiffAnalyzer(),
  auditRepo: AuditRepository = defaultAuditRepository
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

  // 2. Fetch recent commits from GitHub
  const commits = await commitFetcher.fetchRecentCommits(
    user.githubAccessToken || "",
    project.githubRepo
  );
  const latestCommitSha = commits[0]?.sha || null;

  // 3. 10-Minute SHA Cache Check
  if (!input.forceRefresh && latestCommitSha) {
    const latestReport = await auditRepo.findLatestReportForProject(project.id);
    if (latestReport && latestReport.latestCommitSha === latestCommitSha) {
      const ageMs = Date.now() - latestReport.createdAt.getTime();
      const tenMinutesMs = 10 * 60 * 1000;
      if (ageMs < tenMinutesMs) {
        return { report: latestReport, isCached: true };
      }
    }
  }

  // 4. Gather tasks from Linear drafts / scope
  const drafts = await draftRepo.listDraftsForProject(project.id);
  const tasksToVerify: TaskToVerify[] = drafts.map((d, idx) => ({
    id: d.id,
    key: d.linearIssueKey || `TASK-${idx + 1}`,
    title: d.title,
    description: d.description,
    status: d.status === "SYNCED" ? "Done" : d.status === "APPROVED" ? "In Progress" : "Draft",
    priority: d.priority,
    estimate: d.estimate,
  }));

  // If no drafts exist in DB, provide standard verification benchmark tasks
  if (tasksToVerify.length === 0) {
    tasksToVerify.push({
      id: "benchmark_1",
      key: "VAR-101",
      title: "Core Repository Setup & Scaffolding",
      description: "Initialize project structure and dependencies",
      status: "Done",
      priority: 2,
    });
  }

  // 5. Run Dual-Tier Verification Engine
  const verification = await runDualTierVerification({
    tasks: tasksToVerify,
    commits,
    analyzer,
  });

  // 6. Persist Audit Report
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
