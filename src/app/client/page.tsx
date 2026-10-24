import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultAuditRepository } from "@/lib/audit";
import { defaultTaskDraftRepository } from "@/lib/scope";
import { ExecutiveAuditDashboard } from "./audit-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldCheck, LogOut, CheckCircle2, ArrowRight, HelpCircle } from "lucide-react";

export default async function ClientDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?auth=required&role=CLIENT");
  }

  if (session.role !== "CLIENT") {
    redirect("/freelancer");
  }

  const projects = await defaultProjectRepository.listProjectsForClient(session.email);
  const activeProject = projects[0] || null;

  let initialReport = null;
  let history: any[] = [];
  let pendingScopeCount = 0;

  if (activeProject) {
    const rawReport = await defaultAuditRepository.findLatestReportForProject(activeProject.id);
    if (rawReport) {
      initialReport = {
        ...rawReport,
        createdAt: rawReport.createdAt.toISOString(),
      };
    }

    const rawHistory = await defaultAuditRepository.listReportsForProject(activeProject.id);
    history = rawHistory.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    }));

    const drafts = await defaultTaskDraftRepository.listDraftsForProject(activeProject.id);
    pendingScopeCount = drafts.filter(
      (d) =>
        d.clientApprovalStatus === "PENDING_CLIENT_APPROVAL" &&
        d.status !== "DISCARDED" &&
        d.status !== "SYNCED"
    ).length;
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-[#ff385c] selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg tracking-tight text-ink flex items-center gap-2">
                  CommitCheck
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-rausch-bg text-rausch-text border border-rausch-border">
                    Client Audit
                  </span>
                </span>
                <span className="text-[11px] font-medium text-ink-muted tracking-wider uppercase -mt-0.5">
                  Executive Verification Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="flex items-center gap-3 bg-surface-raised px-3 py-1.5 rounded-full border border-border shadow-xs">
              {session.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt={session.name || "Client Avatar"}
                  className="w-7 h-7 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-rausch-bg border border-rausch-border flex items-center justify-center text-xs font-bold text-rausch-text">
                  {(session.name || session.email).substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-ink leading-tight">
                  {session.name || session.email}
                </span>
                <span className="text-[10px] text-ink-muted">{session.email}</span>
              </div>
            </div>

            <span className="hidden md:inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full bg-rausch-bg text-rausch-text border border-rausch-border">
              CLIENT
            </span>

            <a
              href="/api/auth/logout"
              className="p-2 text-ink-muted hover:text-ink transition-colors rounded-full hover:bg-surface-inset border border-transparent hover:border-border"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] mx-auto px-6 py-10 w-full">
        {/* Header */}
        <div className="pb-8 mb-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff385c] animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
                Continuous Delivery Verification
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-text bg-success-bg px-2 py-0.5 rounded-full border border-success-border">
                <CheckCircle2 className="w-3 h-3 text-success-dot" />
                Authenticated Session
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Deliverable Verification & Code Audits
            </h1>
            <p className="text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
              Verify whether deliverables claimed complete in Linear are backed by verifiable code commits in GitHub.
            </p>
          </div>
        </div>

        {/* Pending Scope Confirmation Alert Banner */}
        {activeProject && pendingScopeCount > 0 && (
          <div className="mb-8 p-6 rounded-[14px] bg-warning-bg border border-warning-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-warning-bg text-warning-text font-bold text-base flex items-center justify-center shrink-0 border border-warning-border">
                <HelpCircle className="w-5 h-5 text-warning-text" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warning-text flex items-center gap-2">
                  Scope Confirmation Required
                  <span className="px-2 py-0.5 rounded-full bg-surface-raised text-warning-text text-[11px] font-semibold border border-warning-border">
                    {pendingScopeCount} Pending {pendingScopeCount === 1 ? "Item" : "Items"}
                  </span>
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed max-w-2xl">
                  Your freelancer staged tentative or suggested deliverables from your recent call.
                  Review and confirm them before they enter approved development scope.
                </p>
              </div>
            </div>
            <Link
              href={`/client/projects/${activeProject.id}/scope-confirmation`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-sm hover:shadow transition-all"
            >
              Review & Confirm Scope
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Audit Dashboard or Empty State */}
        {activeProject ? (
          <ExecutiveAuditDashboard
            project={{
              id: activeProject.id,
              title: activeProject.title,
              description: activeProject.description,
              githubRepo: activeProject.githubRepo,
              linearProjectId: activeProject.linearProjectId,
              linearProjectUrl: activeProject.linearProjectUrl || null,
              clientEmail: activeProject.clientEmail,
              createdAt: activeProject.createdAt.toISOString(),
            }}
            initialReport={initialReport}
            history={history}
            auditorRole="CLIENT"
          />
        ) : (
          /* Empty / Initial State */
          <div className="rounded-[14px] border border-dashed border-border bg-surface-raised p-12 md:p-16 text-center shadow-xs">
            <div className="max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-rausch-bg border border-rausch-border flex items-center justify-center mx-auto mb-4 text-rausch-text shadow-xs">
                <ShieldCheck className="w-7 h-7 text-rausch-text" />
              </div>
              <h3 className="text-xl font-bold text-ink mb-2">
                No Active Projects Assigned Yet
              </h3>
              <p className="text-sm text-ink-muted mb-6 leading-relaxed">
                When your freelancer binds this email (<span className="font-medium text-ink">{session.email}</span>) to an active engagement, real-time code verification and discrepancy audits will appear here automatically.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-inset border border-border text-xs font-semibold text-ink">
                <span className="w-2 h-2 rounded-full bg-success-dot animate-pulse"></span>
                Client Verification Portal Active
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
