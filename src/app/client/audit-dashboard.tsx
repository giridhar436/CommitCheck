"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  GitBranch,
  Layers,
  ExternalLink,
  MessageSquare,
  Loader2,
  HelpCircle,
  TrendingUp,
  X,
  History,
  FileCode2,
} from "lucide-react";

export interface CommitInfoUI {
  sha: string;
  message: string;
  author: string;
  date: string;
  url?: string;
}

export interface VerifiedTaskUI {
  taskId: string;
  issueKey: string;
  title: string;
  status: string;
  isVerified: boolean;
  tier: "SYNTACTIC" | "SEMANTIC" | "NONE";
  confidence: number;
  reasoning: string;
  matchedCommits: CommitInfoUI[];
}

export interface DiscrepancyUI {
  id: string;
  type: "GHOST_COMPLETION" | "UNTRACKED_WORK" | "SCOPE_DRIFT" | "STALLED_IN_PROGRESS";
  severity: "HIGH" | "MEDIUM" | "LOW";
  issueKey?: string;
  title: string;
  description: string;
  evidence?: string;
  suggestedRemediation: string;
}

export interface AuditReportUI {
  id: string;
  projectId: string;
  status: string;
  auditorRole: "CLIENT" | "FREELANCER_SELF_CHECK";
  summary: string;
  verifiedPercentage: number;
  ghostCompletions: number;
  untrackedCommits: number;
  latestCommitSha: string | null;
  triggeredById: string;
  createdAt: string;
  verifiedTasks: VerifiedTaskUI[];
  discrepancies: DiscrepancyUI[];
}

export interface ProjectSummaryUI {
  id: string;
  title: string;
  description: string | null;
  githubRepo: string;
  linearProjectId: string | null;
  linearProjectUrl: string | null;
  clientEmail: string | null;
  createdAt: string;
}

export function ExecutiveAuditDashboard({
  project,
  initialReport,
  history = [],
  auditorRole = "CLIENT",
}: {
  project: ProjectSummaryUI;
  initialReport: AuditReportUI | null;
  history?: AuditReportUI[];
  auditorRole?: "CLIENT" | "FREELANCER_SELF_CHECK";
}) {
  const [report, setReport] = useState<AuditReportUI | null>(initialReport);
  const [auditHistory, setAuditHistory] = useState<AuditReportUI[]>(history);
  const [verifying, setVerifying] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "VERIFIED" | "DISCREPANCY">("ALL");

  // Clarification modal state
  const [clarifyTask, setClarifyTask] = useState<VerifiedTaskUI | DiscrepancyUI | null>(null);
  const [clarifyQuestion, setClarifyQuestion] = useState("");
  const [sendingClarify, setSendingClarify] = useState(false);
  const [clarifySuccess, setClarifySuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    "Connecting to Linear & fetching board items...",
    "Inspecting GitHub commits & repository branches...",
    "Running Gemini 1.5 Pro dual-tier semantic diff audit...",
    "Compiling verified progress & ghost completion warnings...",
  ];

  async function handleRunAudit() {
    setVerifying(true);
    setError(null);
    setActiveStep(0);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 600);

    try {
      const res = await fetch(`/api/projects/${project.id}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute audit");
      }

      const formattedReport: AuditReportUI = {
        ...data.report,
        createdAt: new Date(data.report.createdAt).toISOString(),
      };

      setReport(formattedReport);
      setAuditHistory((prev) => [formattedReport, ...prev.filter((r) => r.id !== formattedReport.id)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(stepInterval);
      setVerifying(false);
    }
  }

  async function handleSendClarification(e: React.FormEvent) {
    e.preventDefault();
    if (!clarifyQuestion.trim()) return;

    setSendingClarify(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueKey: (clarifyTask as any)?.issueKey || "",
          taskTitle: clarifyTask?.title || "Project Deliverable",
          question: clarifyQuestion.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send clarification request");
      }

      setClarifySuccess(`Clarification request successfully sent to the freelancer.`);
      setTimeout(() => {
        setClarifyTask(null);
        setClarifyQuestion("");
        setClarifySuccess(null);
      }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingClarify(false);
    }
  }

  const tasks = report?.verifiedTasks || [];
  const filteredTasks = tasks.filter((t) => {
    if (filter === "VERIFIED") return t.isVerified;
    if (filter === "DISCREPANCY") return !t.isVerified || t.status.toLowerCase() === "done";
    return true;
  });

  const verifiedPercent = report ? report.verifiedPercentage : 0;
  const isHealthy = report ? report.ghostCompletions === 0 && verifiedPercent >= 75 : false;
  const hasGhost = report ? report.ghostCompletions > 0 : false;

  return (
    <div className="space-y-8">
      {/* Verification Action Hero */}
      <div className="p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
              Dual-Tier AI Verification Engine
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#222222]">
            {project.title}
          </h2>
          <p className="text-xs text-[#6a6a6a] mt-1 max-w-xl">
            Reconciles Linear board state with real GitHub commit diffs. Discovers whether completed tasks are truly implemented in code.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={handleRunAudit}
            disabled={verifying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-12 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Codebase...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                {report ? "Re-Verify Progress" : "Verify Progress Now"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Stepper Progress */}
      {verifying && (
        <div className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7] animate-in fade-in duration-300">
          <div className="text-xs font-semibold text-[#222222] mb-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#ff385c]" />
            Running Dual-Tier Audit Pipeline...
          </div>
          <div className="space-y-2">
            {steps.map((s, idx) => {
              const isPast = activeStep > idx;
              const isCurrent = activeStep === idx;
              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#ff385c] border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#dddddd] bg-white shrink-0" />
                  )}
                  <span
                    className={`${
                      isPast
                        ? "text-[#222222] font-medium"
                        : isCurrent
                        ? "text-[#ff385c] font-semibold"
                        : "text-[#6a6a6a]"
                    }`}
                  >
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-[8px] bg-[#fff8f6] border border-[#fbd5cb] flex items-start gap-3 text-sm text-[#c13515]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Ghost Completion Alert Banner */}
      {hasGhost && report && (
        <div className="p-6 rounded-[14px] bg-[#fff8f6] border border-[#fbd5cb] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#fbd5cb] flex items-center justify-center shrink-0 text-[#c13515]">
              <AlertTriangle className="w-5 h-5 text-[#c13515]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#c13515]">
                  High Discrepancy: {report.ghostCompletions} Ghost Completion(s) Detected
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c13515] text-white">
                  URGENT
                </span>
              </div>
              <p className="text-xs text-[#717171] mt-1 max-w-2xl leading-relaxed">
                One or more tasks are marked as completed on Linear, but CommitCheck could find no matching code commits or diffs in the GitHub repository.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const ghost = report.discrepancies.find((d) => d.type === "GHOST_COMPLETION");
              if (ghost) setClarifyTask(ghost);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#c13515] hover:bg-[#a52c11] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Request Clarification
          </button>
        </div>
      )}

      {/* Executive Health Metrics Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Progress Card */}
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
              Verified Code Progress
            </span>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-3xl font-semibold text-[#222222]">
                {verifiedPercent}%
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isHealthy
                    ? "bg-emerald-50 text-emerald-700"
                    : hasGhost
                    ? "bg-rose-50 text-rose-700"
                    : "bg-sky-50 text-sky-700"
                }`}
              >
                {isHealthy ? "Healthy" : hasGhost ? "At Risk" : "In Progress"}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-[#f7f7f7] h-2 rounded-full overflow-hidden border border-[#dddddd] mt-2">
              <div
                className={`h-full transition-all duration-500 ${
                  isHealthy ? "bg-emerald-500" : hasGhost ? "bg-[#ff385c]" : "bg-sky-500"
                }`}
                style={{ width: `${verifiedPercent}%` }}
              />
            </div>
          </div>

          {/* Deliverables In Scope */}
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
              Verified Deliverables
            </span>
            <div className="text-3xl font-semibold text-[#222222] my-2">
              {tasks.filter((t) => t.isVerified).length} / {tasks.length}
            </div>
            <p className="text-xs text-[#6a6a6a]">
              Tasks backed by verifiable commit diffs in GitHub.
            </p>
          </div>

          {/* Ghost Completions */}
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
              Ghost Completions
            </span>
            <div
              className={`text-3xl font-semibold my-2 ${
                report.ghostCompletions > 0 ? "text-[#c13515]" : "text-[#222222]"
              }`}
            >
              {report.ghostCompletions}
            </div>
            <p className="text-xs text-[#6a6a6a]">
              Marked Done without code backing.
            </p>
          </div>

          {/* Untracked Work */}
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
              Untracked Work
            </span>
            <div className="text-3xl font-semibold text-[#222222] my-2">
              {report.untrackedCommits}
            </div>
            <p className="text-xs text-[#6a6a6a]">
              Commits outside agreed Linear scope.
            </p>
          </div>
        </div>
      )}

      {/* Task-By-Task Verification Breakdown */}
      {report && (
        <div className="p-6 md:p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#dddddd] gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Deliverable Verification Breakdown
              </h3>
              <p className="text-xs text-[#6a6a6a] mt-0.5">
                Inspect commit links and AI reasoning backing each milestone deliverable.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filter === "ALL"
                    ? "bg-[#222222] text-white"
                    : "bg-[#f7f7f7] text-[#6a6a6a] hover:text-[#222222]"
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => setFilter("VERIFIED")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filter === "VERIFIED"
                    ? "bg-[#222222] text-white"
                    : "bg-[#f7f7f7] text-[#6a6a6a] hover:text-[#222222]"
                }`}
              >
                Verified ({tasks.filter((t) => t.isVerified).length})
              </button>
              <button
                onClick={() => setFilter("DISCREPANCY")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filter === "DISCREPANCY"
                    ? "bg-[#222222] text-white"
                    : "bg-[#f7f7f7] text-[#6a6a6a] hover:text-[#222222]"
                }`}
              >
                Unverified ({tasks.filter((t) => !t.isVerified).length})
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#6a6a6a]">
                No deliverables match this filter.
              </div>
            ) : (
              filteredTasks.map((t) => {
                const isGhost = !t.isVerified && t.status.toLowerCase() === "done";
                return (
                  <div
                    key={t.taskId}
                    className={`p-5 rounded-[12px] border transition-all ${
                      isGhost
                        ? "bg-[#fff8f6] border-[#fbd5cb]"
                        : t.isVerified
                        ? "bg-white border-[#dddddd]"
                        : "bg-[#f7f7f7] border-[#dddddd]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f7f7f7] text-[#222222] border border-[#dddddd]">
                            {t.issueKey}
                          </span>

                          {t.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Verified in Code ({t.tier.toLowerCase()})
                            </span>
                          ) : isGhost ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              Ghost Completion
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              <Clock className="w-3.5 h-3.5 text-sky-600" />
                              In Progress
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-[#222222]">{t.title}</h4>
                        <p className="text-xs text-[#6a6a6a] leading-relaxed">{t.reasoning}</p>

                        {/* Matching Commits */}
                        {t.matchedCommits.length > 0 && (
                          <div className="pt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-[#6a6a6a] uppercase">
                              Backing Commits:
                            </span>
                            {t.matchedCommits.map((c) => (
                              <a
                                key={c.sha}
                                href={c.url || `https://github.com/${project.githubRepo}/commit/${c.sha}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[#f7f7f7] border border-[#dddddd] font-mono text-[11px] text-[#222222] hover:bg-white hover:border-[#222222] transition-colors"
                              >
                                <GitBranch className="w-3 h-3 text-[#6a6a6a]" />
                                {c.sha.substring(0, 7)}
                                <ExternalLink className="w-2.5 h-2.5 text-[#6a6a6a]" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="shrink-0 self-end sm:self-start">
                        {isGhost || !t.isVerified ? (
                          <button
                            onClick={() => setClarifyTask(t)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-xs font-semibold text-[#222222] cursor-pointer shadow-sm transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#ff385c]" />
                            Request Clarification
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Historical Audit Log */}
      {auditHistory.length > 0 && (
        <div className="p-6 md:p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#ff385c]" />
            <h3 className="text-base font-semibold text-[#222222]">
              Audit Execution History
            </h3>
          </div>

          <div className="divide-y divide-[#dddddd]">
            {auditHistory.map((h) => (
              <div
                key={h.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-[#222222]">
                    {h.verifiedPercentage}% Verified
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      h.auditorRole === "CLIENT"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {h.auditorRole === "CLIENT" ? "Client Audit" : "Freelancer Self-Check"}
                  </span>
                  <span className="text-[#6a6a6a]">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[#6a6a6a]">
                  <FileCode2 className="w-3.5 h-3.5" />
                  SHA: {h.latestCommitSha?.substring(0, 7) || "HEAD"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Clarification Modal */}
      {clarifyTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] border border-[#dddddd] max-w-lg w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#dddddd]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#ff385c]" />
                <h4 className="text-base font-semibold text-[#222222]">
                  Request Clarification from Freelancer
                </h4>
              </div>
              <button
                onClick={() => setClarifyTask(null)}
                className="p-1 rounded-full hover:bg-[#f7f7f7] text-[#6a6a6a] hover:text-[#222222] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-xs font-semibold text-[#6a6a6a] uppercase">Regarding Task</span>
              <div className="font-semibold text-sm text-[#222222] mt-0.5">
                {(clarifyTask as any).issueKey ? `[${(clarifyTask as any).issueKey}] ` : ""}
                {clarifyTask.title}
              </div>
            </div>

            {clarifySuccess && (
              <div className="p-3 rounded-[8px] bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {clarifySuccess}
              </div>
            )}

            <form onSubmit={handleSendClarification} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  Your Question or Request *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. I noticed this task is marked Done on Linear, but I couldn't find the matching code commits. Could you point me to the relevant branch or PR?"
                  value={clarifyQuestion}
                  onChange={(e) => setClarifyQuestion(e.target.value)}
                  className="w-full p-3 rounded-[8px] border border-[#dddddd] text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClarifyTask(null)}
                  className="px-4 py-2 rounded-[8px] border border-[#dddddd] text-xs font-medium text-[#222222] hover:bg-[#f7f7f7] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingClarify || !clarifyQuestion.trim()}
                  className="px-5 py-2 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {sendingClarify ? "Dispatching..." : "Send Question to Freelancer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
