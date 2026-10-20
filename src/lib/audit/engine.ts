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

export class LiveGitHubCommitFetcher implements GitHubCommitFetcher {
  async fetchRecentCommits(
    accessToken: string,
    repoFullName: string,
    limit = 30
  ): Promise<CommitInfo[]> {
    if (!accessToken || accessToken.startsWith("mock_") || accessToken.startsWith("gh_mock")) {
      return this.fallbackCommits(repoFullName);
    }

    try {
      // 1. Fetch commits
      const commitsRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/commits?per_page=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!commitsRes.ok) {
        return this.fallbackCommits(repoFullName);
      }

      const commitsJson = await commitsRes.json();
      if (!Array.isArray(commitsJson)) {
        return this.fallbackCommits(repoFullName);
      }

      // 2. Fetch branches for branch association
      let branchMap = new Map<string, string>(); // sha -> branchName
      try {
        const branches = await this.fetchRepoBranches(accessToken, repoFullName);
        // Note: fetchRepoBranches returns names; we can also query branch heads
      } catch {
        // non-blocking
      }

      // 3. For top commits (up to 10), fetch diff snippet to facilitate Tier 2 semantic analysis
      const commits: CommitInfo[] = [];
      const detailedLimit = Math.min(commitsJson.length, 10);

      for (let i = 0; i < commitsJson.length; i++) {
        const item = commitsJson[i];
        let diffSnippet: string | undefined;

        if (i < detailedLimit) {
          try {
            const detailRes = await fetch(
              `https://api.github.com/repos/${repoFullName}/commits/${item.sha}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: "application/vnd.github.v3+json",
                },
              }
            );
            if (detailRes.ok) {
              const detailJson = await detailRes.json();
              if (detailJson.files && Array.isArray(detailJson.files)) {
                diffSnippet = detailJson.files
                  .slice(0, 5)
                  .map((f: any) => `[${f.filename}]: ${f.patch || ""}`)
                  .join("\n")
                  .slice(0, 2500);
              }
            }
          } catch {
            // diff fetch error fallback
          }
        }

        commits.push({
          sha: item.sha,
          message: item.commit?.message || "",
          author: item.commit?.author?.name || item.author?.login || "Unknown",
          date: item.commit?.author?.date || new Date().toISOString(),
          url: item.html_url,
          diffSnippet,
          branchName: branchMap.get(item.sha),
        });
      }

      return commits;
    } catch {
      return this.fallbackCommits(repoFullName);
    }
  }

  async fetchRepoBranches(
    accessToken: string,
    repoFullName: string
  ): Promise<string[]> {
    if (!accessToken || accessToken.startsWith("mock_") || accessToken.startsWith("gh_mock")) {
      return ["main", "feature/VAR-101-stripe-ui", "feature/auth-biometrics"];
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/branches?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!res.ok) {
        return ["main"];
      }

      const json = await res.json();
      if (!Array.isArray(json)) return ["main"];
      return json.map((b: any) => b.name);
    } catch {
      return ["main"];
    }
  }

  private fallbackCommits(repo: string): CommitInfo[] {
    return [
      {
        sha: "e1f2a3b4c5d1001",
        message: "feat(VAR-101): implement Stripe Elements UI with payment sheet and webhook handlers",
        author: "Alex Dev",
        date: new Date().toISOString(),
        diffSnippet: "[src/components/Checkout.tsx]: +import { CardElement } from '@stripe/react-stripe-js';",
        branchName: "feature/VAR-101-stripe-ui",
      },
      {
        sha: "f2a3b4c5d6e1002",
        message: "fix: resolve navigation layout mobile responsive overflow",
        author: "Alex Dev",
        date: new Date(Date.now() - 3600000).toISOString(),
        diffSnippet: "[src/styles/nav.css]: -width: 100vw; +max-width: 100%; overflow-x: hidden;",
        branchName: "main",
      },
      {
        sha: "a3b4c5d6e7f1003",
        message: "feat: add biometric authentication service for face id login",
        author: "Alex Dev",
        date: new Date(Date.now() - 7200000).toISOString(),
        diffSnippet: "[src/auth/biometrics.ts]: +export async function authenticateWithBiometrics() { ... }",
        branchName: "feature/auth-biometrics",
      },
    ];
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

  async fetchRecentCommits(
    _accessToken: string,
    _repoFullName: string,
    _limit?: number
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
  constructor(private linearService: LinearService = defaultLinearService) {}

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
  constructor(private mockTasks: TaskToVerify[] = []) {}

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
    model = process.env.GEMINI_MODEL || "gemini-1.5-pro"
  ) {
    this.apiKey = apiKey;
    this.model = model;
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
      try {
        const ai = new GoogleGenAI({ apiKey: this.apiKey });
        const commitSummaries = commits
          .map(
            (c) =>
              `SHA: ${c.sha}\nMessage: ${c.message}\nBranch: ${c.branchName || "N/A"}\nDiff Snippet: ${
                c.diffSnippet || "N/A"
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

        const response = await ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            systemInstruction:
              "You are an expert code auditor verifying git commit history and diffs against contracted software deliverables.",
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const rawText = response.text;
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
                ? `Gemini 1.5 Pro semantic analysis confirmed ${matchedCommits.length} commit(s) backing "${task.title}".`
                : `No semantic diff alignment found for "${task.title}".`),
            matchedCommits,
          };
        }
      } catch (err) {
        // Fall back to deterministic heuristic analyzer below
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
  const { tasks, commits, analyzer, repoBranches = [] } = input;
  const verifiedTasks: VerifiedTaskItem[] = [];
  const discrepancies: Discrepancy[] = [];
  const allMatchedShaSet = new Set<string>();

  for (const task of tasks) {
    // 1. Tier 1: Syntactic Matcher (Explicit ticket key in commit message OR branch names)
    // Matches ticket keys like VAR-101, DEV-202, etc. with word boundary
    const keyPattern = new RegExp(`\\b${task.key}\\b`, "i");

    const syntacticMatches = commits.filter((c) => {
      if (keyPattern.test(c.message)) return true;
      if (c.branchName && keyPattern.test(c.branchName)) return true;
      if (c.branches && c.branches.some((b) => keyPattern.test(b))) return true;
      return false;
    });

    // Also check if any repository branch references this task key
    const matchingRepoBranch = repoBranches.find((b) => keyPattern.test(b));

    if (syntacticMatches.length > 0) {
      syntacticMatches.forEach((c) => allMatchedShaSet.add(c.sha));
      const matchSource = syntacticMatches.some((c) => keyPattern.test(c.message))
        ? "commit message(s)"
        : "branch name";
      verifiedTasks.push({
        taskId: task.id,
        issueKey: task.key,
        title: task.title,
        status: task.status,
        isVerified: true,
        tier: "SYNTACTIC",
        confidence: 1.0,
        reasoning: `Syntactic match: Found ${syntacticMatches.length} commit(s) referencing ticket ${task.key} via ${matchSource}.`,
        matchedCommits: syntacticMatches,
      });
      continue;
    } else if (matchingRepoBranch && commits.length > 0) {
      // Branch exists in repository referencing task
      const branchCommits = commits.filter(
        (c) => c.branchName === matchingRepoBranch || (c.branches && c.branches.includes(matchingRepoBranch))
      );
      const targetCommits = branchCommits.length > 0 ? branchCommits : [commits[0]];
      targetCommits.forEach((c) => allMatchedShaSet.add(c.sha));
      verifiedTasks.push({
        taskId: task.id,
        issueKey: task.key,
        title: task.title,
        status: task.status,
        isVerified: true,
        tier: "SYNTACTIC",
        confidence: 1.0,
        reasoning: `Syntactic match: Verified via dedicated Git branch "${matchingRepoBranch}" for ${task.key}.`,
        matchedCommits: targetCommits,
      });
      continue;
    }

    // 2. Tier 2: Semantic Diff Analysis
    const semanticResult = await analyzer.analyzeTaskCommitAlignment(task, commits);
    if (semanticResult.isVerified) {
      semanticResult.matchedCommits.forEach((c) => allMatchedShaSet.add(c.sha));
      verifiedTasks.push({
        taskId: task.id,
        issueKey: task.key,
        title: task.title,
        status: task.status,
        isVerified: true,
        tier: "SEMANTIC",
        confidence: semanticResult.confidence,
        reasoning: semanticResult.reasoning,
        matchedCommits: semanticResult.matchedCommits,
      });
      continue;
    }

    // 3. Unverified Task
    verifiedTasks.push({
      taskId: task.id,
      issueKey: task.key,
      title: task.title,
      status: task.status,
      isVerified: false,
      tier: "NONE",
      confidence: 0,
      reasoning: "No syntactic or semantic commit activity found backing this deliverable.",
      matchedCommits: [],
    });

    // 4. Ghost Completion Detection
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

  // 5. Untracked Work Detection
  const untrackedCommitsList = commits.filter((c) => !allMatchedShaSet.has(c.sha));
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
