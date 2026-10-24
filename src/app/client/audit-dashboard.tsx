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
  AlertOctagon,
  Activity,
  Check,
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
    "Connecting to Linear & fetching active board issues...",
    "Inspecting GitHub repository commit history & tree diffs...",
    "Running Gemini dual-tier AST semantic verification...",
    "Compiling verified deliverables & flagging ghost completions...",
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
      <div className="p-8 rounded-[14px] border border-border bg-surface-raised saas-card-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
              Dual-Tier AI Verification Engine
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-inset text-ink-muted border border-border">
              AST Semantic Diff
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            {project.title}
          </h2>
          <p className="text-xs text-ink-muted mt-1.5 max-w-xl leading-relaxed">
            Reconciles Linear board issues with real GitHub commit diffs. Discovers whether tasks marked completed are truly implemented in code.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={handleRunAudit}
            disabled={verifying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 h-11 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
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
        <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-shadow animate-in fade-in duration-300">
          <div className="text-xs font-bold text-ink mb-4 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#ff385c]" />
            Running Dual-Tier Audit Pipeline...
          </div>
          <div className="space-y-2.5">
            {steps.map((s, idx) => {
              const isPast = activeStep > idx;
              const isCurrent = activeStep === idx;
              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-success-dot shrink-0" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#ff385c] border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border bg-surface-inset shrink-0" />
                  )}
                  <span
                    className={`${
                      isPast
                        ? "text-ink font-medium"
                        : isCurrent
                        ? "text-[#ff385c] font-semibold"
                        : "text-ink-faint"
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
        <div className="p-4 rounded-[8px] bg-error-bg border border-error-border flex items-start gap-3 text-sm text-error-text">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Ghost Completion Alert Banner */}
      {hasGhost && report && (
        <div className="p-6 rounded-[14px] bg-error-bg border border-error-border flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-error-border flex items-center justify-center shrink-0 text-error-text">
              <AlertOctagon className="w-5 h-5 text-error-text" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-error-text">
                  High Discrepancy: {report.ghostCompletions} Ghost Completion(s) Detected
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c13515] text-white">
                  URGENT
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-1 max-w-2xl leading-relaxed">
                One or more tasks are marked as completed in Linear, but CommitCheck found zero matching code commits or diffs in the GitHub repository.
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
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Verified Code Progress
              </span>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl font-bold tracking-tight text-ink">
                  {verifiedPercent}%
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isHealthy
                      ? "bg-success-bg text-success-text border border-success-border"
                      : hasGhost
                      ? "bg-error-bg text-error-text border border-error-border"
                      : "bg-info-bg text-info-text border border-info-border"
                  }`}
                >
                  {isHealthy ? "Healthy" : hasGhost ? "At Risk" : "In Progress"}
                </span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-surface-inset h-2 rounded-full overflow-hidden border border-border mt-3">
              <div
                className={`h-full transition-all duration-500 ${
                  isHealthy ? "bg-emerald-500" : hasGhost ? "bg-[#ff385c]" : "bg-sky-500"
                }`}
                style={{ width: `${verifiedPercent}%` }}
              />
            </div>
          </div>

          {/* Deliverables In Scope */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Verified Deliverables
              </span>
              <div className="text-3xl font-bold tracking-tight text-ink my-2">
                {tasks.filter((t) => t.isVerified).length} / {tasks.length}
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              Tasks backed by verifiable commit diffs in GitHub.
            </p>
          </div>

          {/* Ghost Completions */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Ghost Completions
              </span>
              <div
                className={`text-3xl font-bold tracking-tight my-2 ${
                  report.ghostCompletions > 0 ? "text-error-text" : "text-ink"
                }`}
              >
                {report.ghostCompletions}
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              Marked Done without matching code commits.
            </p>
          </div>

          {/* Untracked Work */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Untracked Work
              </span>
              <div className="text-3xl font-bold tracking-tight text-ink my-2">
                {report.untrackedCommits}
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              Commits outside agreed Linear milestones.
            </p>
          </div>
        </div>
      )}

      {/* Task-By-Task Verification Breakdown */}
      {report && (
        <div className="p-6 md:p-8 rounded-[14px] border border-border bg-surface-raised saas-card-shadow space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-soft gap-4">
            <div>
              <h3 className="text-lg font-bold text-ink">
                Deliverable Verification Breakdown
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Inspect commit links and AI reasoning backing each milestone deliverable.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filter === "ALL"
                    ? "bg-ink text-canvas shadow-xs"
                    : "bg-surface-inset text-ink-muted hover:text-ink"
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => setFilter("VERIFIED")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filter === "VERIFIED"
                    ? "bg-ink text-canvas shadow-xs"
                    : "bg-surface-inset text-ink-muted hover:text-ink"
                }`}
              >
                Verified ({tasks.filter((t) => t.isVerified).length})
              </button>
              <button
                onClick={() => setFilter("DISCREPANCY")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filter === "DISCREPANCY"
                    ? "bg-ink text-canvas shadow-xs"
                    : "bg-surface-inset text-ink-muted hover:text-ink"
                }`}
              >
                Unverified ({tasks.filter((t) => !t.isVerified).length})
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-3.5">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-10 text-xs text-ink-muted">
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
                        ? "bg-error-bg border-error-border"
                        : t.isVerified
                        ? "bg-surface-raised border-border hover:border-border-strong"
                        : "bg-surface-inset border-border"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-inset text-ink border border-border">
                            {t.issueKey}
                          </span>

                          {t.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-bg text-success-text border border-success-border">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success-dot" />
                              Verified in Code ({t.tier.toLowerCase()})
                            </span>
                          ) : isGhost ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-error-bg text-error-text border border-error-border">
                              <AlertTriangle className="w-3.5 h-3.5 text-error-text" />
                              Ghost Completion
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-info-bg text-info-text border border-info-border">
                              <Clock className="w-3.5 h-3.5 text-info-text" />
                              In Progress
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-ink">{t.title}</h4>
                        <p className="text-xs text-ink-muted leading-relaxed">{t.reasoning}</p>

                        {/* Matching Commits */}
                        {t.matchedCommits.length > 0 && (
                          <div className="pt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                              Backing Commits:
                            </span>
                            {t.matchedCommits.map((c) => (
                              <a
                                key={c.sha}
                                href={c.url || `https://github.com/${project.githubRepo}/commit/${c.sha}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-surface-inset border border-border font-mono text-[11px] text-ink hover:bg-surface-raised hover:border-border-strong transition-colors"
                              >
                                <GitBranch className="w-3 h-3 text-ink-muted" />
                                {c.sha.substring(0, 7)}
                                <ExternalLink className="w-2.5 h-2.5 text-ink-muted" />
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-surface-raised border border-border hover:bg-surface-inset text-xs font-semibold text-ink cursor-pointer shadow-xs transition-all"
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
        <div className="p-6 md:p-8 rounded-[14px] border border-border bg-surface-raised saas-card-shadow space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#ff385c]" />
            <h3 className="text-base font-bold text-ink">
              Audit Execution History
            </h3>
          </div>

          <div className="divide-y divide-border-soft">
            {auditHistory.map((h) => (
              <div
                key={h.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-ink">
                    {h.verifiedPercentage}% Verified
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      h.auditorRole === "CLIENT"
                        ? "bg-rausch-bg text-rausch-text border border-rausch-border"
                        : "bg-info-bg text-info-text border border-info-border"
                    }`}
                  >
                    {h.auditorRole === "CLIENT" ? "Client Audit" : "Freelancer Self-Check"}
                  </span>
                  <span className="text-ink-muted">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-ink-muted">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-raised rounded-[14px] border border-border max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border-soft">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#ff385c]" />
                <h4 className="text-base font-bold text-ink">
                  Request Clarification from Freelancer
                </h4>
              </div>
              <button
                onClick={() => setClarifyTask(null)}
                className="p-1 rounded-full hover:bg-surface-inset text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Regarding Deliverable</span>
              <div className="font-bold text-sm text-ink mt-0.5">
                {(clarifyTask as any).issueKey ? `[${(clarifyTask as any).issueKey}] ` : ""}
                {clarifyTask.title}
              </div>
            </div>

            {clarifySuccess && (
              <div className="p-3 rounded-[8px] bg-success-bg border border-success-border text-xs text-success-text flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-dot" />
                {clarifySuccess}
              </div>
            )}

            <form onSubmit={handleSendClarification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Your Question or Request *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. I noticed this task is marked Done on Linear, but I couldn't find the matching code commits. Could you point me to the relevant branch or PR?"
                  value={clarifyQuestion}
                  onChange={(e) => setClarifyQuestion(e.target.value)}
                  className="w-full p-3 rounded-[8px] border border-border bg-surface-inset text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-[#ff385c]/20 focus:border-[#ff385c] transition-all"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setClarifyTask(null)}
                  className="px-4 py-2 rounded-[8px] border border-border text-xs font-semibold text-ink hover:bg-surface-inset cursor-pointer transition-colors"
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
