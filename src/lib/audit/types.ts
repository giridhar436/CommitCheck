export type AuditorRole = "CLIENT" | "FREELANCER_SELF_CHECK";

export type VerificationTier = "SYNTACTIC" | "SEMANTIC" | "NONE";

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url?: string;
  diffSnippet?: string;
  branchName?: string;
  branches?: string[];
}

export interface TaskToVerify {
  id: string;
  key: string;
  title: string;
  description: string;
  status: string; // e.g. "Done" | "In Progress" | "Todo" | "Backlog"
  statusType?: string; // "completed" | "started" | "unstarted" | "canceled"
  priority?: number;
  estimate?: number | null;
}

export interface VerifiedTaskItem {
  taskId: string;
  issueKey: string;
  title: string;
  status: string;
  isVerified: boolean;
  tier: VerificationTier;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  matchedCommits: CommitInfo[];
}

export type DiscrepancyType =
  | "GHOST_COMPLETION"
  | "UNTRACKED_WORK"
  | "SCOPE_DRIFT"
  | "STALLED_IN_PROGRESS";

export type DiscrepancySeverity = "HIGH" | "MEDIUM" | "LOW";

export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  issueKey?: string;
  title: string;
  description: string;
  evidence?: string;
  suggestedRemediation: string;
}

export interface AuditReportData {
  id: string;
  projectId: string;
  status: string;
  auditorRole: AuditorRole;
  summary: string;
  verifiedPercentage: number;
  ghostCompletions: number;
  untrackedCommits: number;
  latestCommitSha: string | null;
  triggeredById: string;
  createdAt: Date;
  verifiedTasks: VerifiedTaskItem[];
  discrepancies: Discrepancy[];
}

export interface AuditRepository {
  createAuditReport(data: {
    projectId: string;
    auditorRole: AuditorRole;
    summary: string;
    verifiedPercentage: number;
    verifiedTasks: VerifiedTaskItem[];
    discrepancies: Discrepancy[];
    ghostCompletions: number;
    untrackedCommits: number;
    latestCommitSha?: string | null;
    triggeredById: string;
  }): Promise<AuditReportData>;
  findLatestReportForProject(projectId: string): Promise<AuditReportData | null>;
  listReportsForProject(projectId: string): Promise<AuditReportData[]>;
}

export interface GitHubCommitFetcher {
  fetchRecentCommits(
    accessToken: string,
    repoFullName: string,
    limit?: number
  ): Promise<CommitInfo[]>;
  fetchRepoBranches?(
    accessToken: string,
    repoFullName: string
  ): Promise<string[]>;
}

export interface LinearIssueFetcher {
  fetchProjectTasks(
    accessToken: string,
    linearProjectId: string
  ): Promise<TaskToVerify[]>;
}

export interface SemanticDiffAnalyzer {
  analyzeTaskCommitAlignment(
    task: TaskToVerify,
    commits: CommitInfo[]
  ): Promise<{ isVerified: boolean; confidence: number; reasoning: string; matchedCommits: CommitInfo[] }>;
}
