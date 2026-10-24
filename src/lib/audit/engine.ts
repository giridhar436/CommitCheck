import { GoogleGenAI } from "@google/genai";
import { defaultLinearService } from "../linear";
import { LinearService } from "../linear/types";
import {
  CommitInfo,
  Discrepancy,
  GitHubCommitFetcher,
  LinearIssueFetcher,
  SemanticDiffAnalyzer,
  TaskToVerify,
  VerificationTier,
  VerifiedTaskItem,
} from "./types";

export function isMockOrPlaceholderToken(token?: string | null): boolean {
  if (!token) return true;
  const t = token.trim();
  return (
    t === "" ||
    t === "mock_token" ||
    t === "test-token" ||
    t === "demo-token" ||
    t === "fake-token" ||
    t.startsWith("mock_") ||
    t.startsWith("gh_mock") ||
    t.startsWith("fake_") ||
    t.startsWith("test_")
  );
}

export class GitHubVerificationError extends Error {
  code = "GITHUB_VERIFICATION_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "GitHubVerificationError";
  }
}

export class LiveGitHubCommitFetcher implements GitHubCommitFetcher {
  async verifyRepoAccess(
    accessToken: string,
    repoFullName: string
  ): Promise<boolean> {
    if (!accessToken || isMockOrPlaceholderToken(accessToken)) {
      return false;
    }
    try {
      const res = await fetch(`https://api.github.com/repos/${repoFullName}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CommitCheck-App",
        },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async fetchRecentCommits(
    accessToken: string,
    repoFullName: string,
    limit = 30,
    since?: string
  ): Promise<CommitInfo[]> {
    if (!accessToken || isMockOrPlaceholderToken(accessToken)) {
      throw new GitHubVerificationError(
        "GitHub verification unavailable: Missing or invalid GitHub credentials."
      );
    }

    try {
      // 1. Fetch commits
      const sinceQuery = since ? `&since=${encodeURIComponent(since)}` : "";
      const commitsRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/commits?per_page=${limit}${sinceQuery}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "CommitCheck-App",
          },
        }
      );

      if (commitsRes.status === 401) {
        throw new GitHubVerificationError(
          "GitHub verification unavailable: Unauthorized or expired GitHub credentials."
        );
      }

      if (commitsRes.status === 404) {
        throw new GitHubVerificationError(
          `GitHub verification unavailable: Repository '${repoFullName}' not found or access denied.`
        );
      }

      if (!commitsRes.ok) {
        throw new GitHubVerificationError(
          `GitHub verification unavailable: GitHub API error (${commitsRes.status}).`
        );
      }

      const commitsJson = await commitsRes.json();
      if (!Array.isArray(commitsJson)) {
        throw new GitHubVerificationError(
          "GitHub verification unavailable: Unexpected response format from GitHub API."
        );
      }


      // 2. Fetch branches for branch association
      const branchMap = new Map<string, string>(); // sha -> branchName
      try {
        const branches = await this.fetchRepoBranches(accessToken, repoFullName);
        // Note: fetchRepoBranches returns names; we can also query branch heads
      } catch {
        // non-blocking
      }

      // 3. For top commits (up to 10), fetch diff snippet concurrently to facilitate Tier 2 semantic analysis


      const detailedLimit = Math.min(commitsJson.length, 10);
      const diffResults = await Promise.all(
        commitsJson.slice(0, detailedLimit).map(async (item: any) => {
          try {
            const detailRes = await fetch(
              `https://api.github.com/repos/${repoFullName}/commits/${item.sha}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: "application/vnd.github.v3+json",
                  "User-Agent": "CommitCheck-App",
                },
              }
            );
            if (detailRes.ok) {
              const detailJson = await detailRes.json();
              if (detailJson.files && Array.isArray(detailJson.files)) {
                const diffSnippet = detailJson.files
                  .slice(0, 5)
                  .map((f: any) => `[${f.filename}]: ${f.patch || ""}`)
                  .join("\n")
                  .slice(0, 2500);
                return { sha: item.sha, diffSnippet };
              }
            }
          } catch {
            // diff fetch error fallback (individual diff is non-blocking)
          }
          return { sha: item.sha, diffSnippet: undefined };
        })
      );

      const diffMap = new Map<string, string | undefined>(
        diffResults.map((d) => [d.sha, d.diffSnippet])
      );

      const commits: CommitInfo[] = commitsJson.map((item: any) => ({
        sha: item.sha,
        message: item.commit?.message || "",
        author: item.commit?.author?.name || item.author?.login || "Unknown",
        date: item.commit?.author?.date || new Date().toISOString(),
        url: item.html_url,
        diffSnippet: diffMap.get(item.sha),
        branchName: undefined,
      }));

      return commits;
    } catch (err: any) {
      if (err instanceof GitHubVerificationError || err?.code === "GITHUB_VERIFICATION_UNAVAILABLE") {
        throw err;
      }
      throw new GitHubVerificationError(
        `GitHub verification unavailable: ${err?.message || "Failed to reach GitHub API"}`
      );
    }
  }

  async fetchRepoBranches(
    accessToken: string,
    repoFullName: string
  ): Promise<string[]> {
    if (!accessToken || isMockOrPlaceholderToken(accessToken)) {
      return [];
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/branches?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "CommitCheck-App",
          },
        }
      );

      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      if (!Array.isArray(json)) return [];
      return json.map((b: any) => b.name);
    } catch {
      return [];
    }
  }
}

export class MockGitHubCommitFetcher implements GitHubCommitFetcher {
  private commits: CommitInfo[];
  private branches: string[];

  constructor(customCommits?: CommitInfo[], customBranches?: string[]) {
    this.commits = customCommits || [
      {
        sha: "c001_mock",
        message: "feat(VAR-101): implement Stripe Elements UI",
        author: "Dev",
        date: new Date().toISOString(),
        diffSnippet: "+<StripeCardElement />",
        branchName: "feature/VAR-101-stripe",
      },
      {
        sha: "c002_mock",
        message: "add webhook receipt processor for checkout payments",
        author: "Dev",
        date: new Date().toISOString(),
        diffSnippet: "+handleStripeWebhookEvent(payload)",
        branchName: "main",
      },
    ];
    this.branches = customBranches || ["main", "feature/VAR-101-stripe"];
  }

  async verifyRepoAccess(
    _accessToken: string,
    _repoFullName: string
  ): Promise<boolean> {
    return true;
  }

  async fetchRecentCommits(
    _accessToken: string,
    _repoFullName: string,
    _limit?: number,
    _since?: string
  ): Promise<CommitInfo[]> {
    return [...this.commits];
  }

  async fetchRepoBranches(
    _accessToken: string,
    _repoFullName: string
  ): Promise<string[]> {
    return [...this.branches];
  }

  setCommits(commits: CommitInfo[]) {
    this.commits = commits;
  }

  setBranches(branches: string[]) {
    this.branches = branches;
  }
}

export class LiveLinearIssueFetcher implements LinearIssueFetcher {
  constructor(private linearService: LinearService = defaultLinearService) { }

  async fetchProjectTasks(
    accessToken: string,
    linearProjectId: string
  ): Promise<TaskToVerify[]> {
    if (!accessToken || !linearProjectId) {
      return [];
    }

    const issues = await this.linearService.fetchProjectIssues(accessToken, linearProjectId);
    return issues.map((issue) => ({
      id: issue.id,
      key: issue.identifier,
      title: issue.title,
      description: issue.description || "",
      status: issue.status || "Todo",
      statusType: issue.statusType,
      priority: issue.priority,
      estimate: issue.estimate,
    }));
  }
}

export class MockLinearIssueFetcher implements LinearIssueFetcher {
  constructor(private mockTasks: TaskToVerify[] = []) { }

  async fetchProjectTasks(
    _accessToken: string,
    _linearProjectId: string
  ): Promise<TaskToVerify[]> {
    if (this.mockTasks.length > 0) {
      return [...this.mockTasks];
    }
    return [
      {
        id: "mock_t_1",
        key: "DEV-101",
        title: "Implement Biometric FaceID Flow",
        description: "Support local iOS FaceID authentication",
        status: "Done",
        statusType: "completed",
        priority: 1,
        estimate: 5,
      },
      {
        id: "mock_t_2",
        key: "DEV-102",
        title: "Configure Stripe Customer Portal",
        description: "Embed customer billing portal for subscription upgrades",
        status: "In Progress",
        statusType: "started",
        priority: 2,
        estimate: 3,
      },
    ];
  }

  setTasks(tasks: TaskToVerify[]) {
    this.mockTasks = tasks;
  }
}

export class GeminiSemanticDiffAnalyzer implements SemanticDiffAnalyzer {
  private apiKey: string;
  private model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY || "",
    model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  protected getAiClient(): any {
    return new GoogleGenAI({ apiKey: this.apiKey });
  }

  async analyzeTaskCommitAlignment(
    task: TaskToVerify,
    commits: CommitInfo[]
  ): Promise<{
    isVerified: boolean;
    confidence: number;
    reasoning: string;
    matchedCommits: CommitInfo[];
  }> {
    if (!commits || commits.length === 0) {
      return {
        isVerified: false,
        confidence: 0,
        reasoning: "No commits available to analyze.",
        matchedCommits: [],
      };
    }

    // 1. Try Gemini Live SDK if apiKey is configured and live
    if (
      this.apiKey &&
      !this.apiKey.startsWith("mock_") &&
      !this.apiKey.startsWith("offline") &&
      this.apiKey !== "test_key"
    ) {
      const abortController = new AbortController();
      const timeoutMs = 10000;
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      try {
        const ai = this.getAiClient();
        const commitSummaries = commits
          .map(
            (c) =>
              `SHA: ${c.sha}\nMessage: ${c.message}\nBranch: ${c.branchName || "N/A"}\nDiff Snippet: ${c.diffSnippet || "N/A"
              }`
          )
          .join("\n---\n");

        const prompt = `Analyze whether the following git commits implement, contribute to, or substantiate the specified deliverable task.

Task:
- Key: ${task.key}
- Title: ${task.title}
- Description: ${task.description}

Repository Commits:
${commitSummaries}

Respond ONLY with valid JSON in this schema:
{
  "isVerified": boolean,
  "confidence": number, // float 0.0 to 1.0
  "reasoning": string,
  "matchedShas": string[]
}
`;

        const geminiPromise = ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            systemInstruction:
              "You are an expert code auditor verifying git commit history and diffs against contracted software deliverables.",
            responseMimeType: "application/json",
            abortSignal: abortController.signal,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          abortController.signal.addEventListener("abort", () => {
            reject(new Error("Gemini semantic analysis timed out after 10000ms"));
          });
        });

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        const rawText = response?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const matchedCommits = commits.filter((c) =>
            Array.isArray(parsed.matchedShas) ? parsed.matchedShas.includes(c.sha) : false
          );
          const isVerified = Boolean(parsed.isVerified) && (parsed.confidence ?? 0) >= 0.70;
          return {
            isVerified,
            confidence: Math.max(0, Math.min(1.0, parsed.confidence ?? (isVerified ? 0.85 : 0.2))),
            reasoning:
              parsed.reasoning ||
              (isVerified
                ? `Gemini semantic analysis confirmed ${matchedCommits.length} commit(s) backing "${task.title}".`
                : `No semantic diff alignment found for "${task.title}".`),
            matchedCommits,
          };
        }

        return {
          isVerified: false,
          confidence: 0,
          reasoning: `Semantic diff analysis unavailable: Gemini returned an empty or unparseable response for "${task.title}". Deliverable marked unresolved.`,
          matchedCommits: [],
        };
      } catch (err: any) {
        // Critical safety rule: If live Gemini fails or times out, never fabricate or fall back to heuristic verification!
        const isTimeout = err?.message?.includes("timed out") || abortController.signal.aborted;
        return {
          isVerified: false,
          confidence: 0,
          reasoning: isTimeout
            ? `Semantic diff analysis unavailable: Gemini request timed out (10s threshold) for "${task.title}". Deliverable marked unresolved.`
            : `Semantic diff analysis unavailable: Gemini API error (${err?.message || "unknown"}) for "${task.title}". Deliverable marked unresolved.`,
          matchedCommits: [],
        };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // 2. Deterministic Semantic Heuristic Analyzer (Used in tests and offline environments)
    const taskKeywords = `${task.title} ${task.description}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !["with", "this", "from", "that", "make", "need", "have", "user", "will"].includes(w));

    const matchedCommits: CommitInfo[] = [];
    let matchScore = 0;

    for (const commit of commits) {
      const commitText = `${commit.message} ${commit.diffSnippet || ""} ${commit.branchName || ""}`.toLowerCase();
      let matches = 0;
      for (const kw of taskKeywords) {
        if (commitText.includes(kw)) {
          matches++;
        }
      }

      if (matches >= 2 || (matches >= 1 && taskKeywords.length <= 2)) {
        matchedCommits.push(commit);
        matchScore += matches;
      }
    }

    if (matchedCommits.length > 0) {
      const confidence = Math.min(0.95, 0.65 + matchScore * 0.1);
      return {
        isVerified: true,
        confidence,
        reasoning: `Semantic diff analysis matched ${matchedCommits.length} commit(s) covering key concepts: "${task.title}".`,
        matchedCommits,
      };
    }

    return {
      isVerified: false,
      confidence: 0.1,
      reasoning: `No semantic correlation found between git activity and deliverable criteria for "${task.title}".`,
      matchedCommits: [],
    };
  }
}

export interface VerificationEngineInput {
  tasks: TaskToVerify[];
  commits: CommitInfo[];
  analyzer: SemanticDiffAnalyzer;
  repoBranches?: string[];
  baselineDate?: Date | string;
}

export interface VerificationEngineOutput {
  verifiedTasks: VerifiedTaskItem[];
  discrepancies: Discrepancy[];
  verifiedPercentage: number;
  ghostCompletionsCount: number;
  untrackedCommitsCount: number;
  summary: string;
}

export async function runDualTierVerification(
  input: VerificationEngineInput
): Promise<VerificationEngineOutput> {
  const { tasks, commits, analyzer, repoBranches = [], baselineDate } = input;
  const discrepancies: Discrepancy[] = [];
  const allMatchedShaSet = new Set<string>();

  // Baseline boundary: Do not count GitHub activity that existed before the project started
  const baselineTime = baselineDate ? new Date(baselineDate).getTime() : null;
  const eligibleCommits =
    baselineTime !== null && !isNaN(baselineTime)
      ? commits.filter((c) => {
        if (!c.date) return false;
        const commitTime = new Date(c.date).getTime();
        return !isNaN(commitTime) && commitTime >= (baselineTime - 1000);
      })
      : commits;

  const results: (VerifiedTaskItem | null)[] = new Array(tasks.length).fill(null);
  const pendingTier2: { task: TaskToVerify; index: number }[] = [];

  // Pass 1: Tier 1 Syntactic Matcher (Explicit ticket key in commit message OR branch names)
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const keyPattern = new RegExp(`\\b${task.key}\\b`, "i");

    const syntacticMatches = eligibleCommits.filter((c) => {
      if (keyPattern.test(c.message)) return true;
      if (c.branchName && keyPattern.test(c.branchName)) return true;
      if (c.branches && c.branches.some((b) => keyPattern.test(b))) return true;
      return false;
    });

    const matchingRepoBranch = repoBranches.find((b) => keyPattern.test(b));

    if (syntacticMatches.length > 0) {
      syntacticMatches.forEach((c) => allMatchedShaSet.add(c.sha));
      const matchSource = syntacticMatches.some((c) => keyPattern.test(c.message))
        ? "commit message(s)"
        : "branch name";
      results[i] = {
        taskId: task.id,
        issueKey: task.key,
        title: task.title,
        status: task.status,
        isVerified: true,
        tier: "SYNTACTIC",
        confidence: 1.0,
        reasoning: `Syntactic match: Found ${syntacticMatches.length} commit(s) referencing ticket ${task.key} via ${matchSource}.`,
        matchedCommits: syntacticMatches,
      };
    } else if (matchingRepoBranch && eligibleCommits.length > 0) {
      const branchCommits = eligibleCommits.filter(
        (c) => c.branchName === matchingRepoBranch || (c.branches && c.branches.includes(matchingRepoBranch))
      );
      const targetCommits = branchCommits.length > 0 ? branchCommits : [eligibleCommits[0]];
      targetCommits.forEach((c) => allMatchedShaSet.add(c.sha));
      results[i] = {
        taskId: task.id,
        issueKey: task.key,
        title: task.title,
        status: task.status,
        isVerified: true,
        tier: "SYNTACTIC",
        confidence: 1.0,
        reasoning: `Syntactic match: Verified via dedicated Git branch "${matchingRepoBranch}" for ${task.key}.`,
        matchedCommits: targetCommits,
      };
    } else {
      pendingTier2.push({ task, index: i });
    }
  }

  // Pass 2: Tier 2 Semantic Diff Analysis with controlled concurrency (3 at a time)
  const CONCURRENCY_LIMIT = 3;
  for (let i = 0; i < pendingTier2.length; i += CONCURRENCY_LIMIT) {
    const chunk = pendingTier2.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(
      chunk.map(async ({ task, index }) => {
        try {
          const semanticResult = await analyzer.analyzeTaskCommitAlignment(task, eligibleCommits);
          if (semanticResult.isVerified) {
            semanticResult.matchedCommits.forEach((c) => allMatchedShaSet.add(c.sha));
            results[index] = {
              taskId: task.id,
              issueKey: task.key,
              title: task.title,
              status: task.status,
              isVerified: true,
              tier: "SEMANTIC",
              confidence: semanticResult.confidence,
              reasoning: semanticResult.reasoning,
              matchedCommits: semanticResult.matchedCommits,
            };
          } else {
            results[index] = {
              taskId: task.id,
              issueKey: task.key,
              title: task.title,
              status: task.status,
              isVerified: false,
              tier: "NONE",
              confidence: 0,
              reasoning:
                semanticResult.reasoning ||
                "No syntactic or semantic commit activity found backing this deliverable.",
              matchedCommits: [],
            };
          }
        } catch {
          results[index] = {
            taskId: task.id,
            issueKey: task.key,
            title: task.title,
            status: task.status,
            isVerified: false,
            tier: "NONE",
            confidence: 0,
            reasoning:
              "Semantic diff analysis unavailable: Analysis failed. Deliverable marked unresolved.",
            matchedCommits: [],
          };
        }
      })
    );
  }

  const verifiedTasks: VerifiedTaskItem[] = results as VerifiedTaskItem[];

  // Ghost Completion Detection
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const item = results[i]!;
    if (!item.isVerified) {
      const isMarkedCompleted =
        task.status.toLowerCase() === "done" ||
        task.status.toLowerCase() === "completed" ||
        task.status.toLowerCase() === "closed" ||
        task.statusType === "completed";

      if (isMarkedCompleted) {
        discrepancies.push({
          id: `disc_ghost_${task.id}`,
          type: "GHOST_COMPLETION",
          severity: "HIGH",
          issueKey: task.key,
          title: `Ghost Completion: ${task.key} - ${task.title}`,
          description: `This task is marked "${task.status}" in Linear, but no code diffs or commit history were detected in the bound repository.`,
          suggestedRemediation: `Push the supporting commits referencing ${task.key} or revert the task status in Linear until code is delivered.`,
        });
      }
    }
  }

  // 5. Untracked Work Detection
  const untrackedCommitsList = eligibleCommits.filter((c) => !allMatchedShaSet.has(c.sha));
  for (const un of untrackedCommitsList) {
    // Only flag non-merge non-trivial commits
    if (
      !un.message.startsWith("Merge branch") &&
      !un.message.startsWith("Merge pull") &&
      !un.message.startsWith("Merge remote")
    ) {
      discrepancies.push({
        id: `disc_untracked_${un.sha.substring(0, 7)}`,
        type: "UNTRACKED_WORK",
        severity: "LOW",
        title: `Untracked Code: ${un.message.split("\n")[0].substring(0, 60)}`,
        description: `Commit "${un.sha.substring(0, 7)}" was pushed by ${un.author} without matching any planned Linear task in scope.`,
        evidence: un.sha,
        suggestedRemediation: `Link this work to an existing Linear task or create an addendum deliverable.`,
      });
    }
  }

  // 6. Progress Percentage Calculation
  const totalTasks = tasks.length;
  const verifiedCount = verifiedTasks.filter((t) => t.isVerified).length;
  const verifiedPercentage = totalTasks > 0 ? Math.round((verifiedCount / totalTasks) * 100) : 0;

  const ghostCompletionsCount = discrepancies.filter(
    (d) => d.type === "GHOST_COMPLETION"
  ).length;
  const untrackedCommitsCount = discrepancies.filter(
    (d) => d.type === "UNTRACKED_WORK"
  ).length;

  let summary = `Verification completed: ${verifiedCount} of ${totalTasks} tasks verified (${verifiedPercentage}%).`;
  if (ghostCompletionsCount > 0) {
    summary += ` Warning: ${ghostCompletionsCount} Ghost Completion(s) flagged!`;
  }
  if (untrackedCommitsCount > 0) {
    summary += ` ${untrackedCommitsCount} untracked commit(s) identified.`;
  }

  return {
    verifiedTasks,
    discrepancies,
    verifiedPercentage,
    ghostCompletionsCount,
    untrackedCommitsCount,
    summary,
  };
}
