import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultAuditRepository } from "@/lib/audit";
import { defaultTaskDraftRepository } from "@/lib/scope";
import { ExecutiveAuditDashboard } from "./audit-dashboard";
import { ShieldCheck, LogOut, CheckCircle2 } from "lucide-react";

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
    <div className="min-h-screen bg-white text-[#222222] flex flex-col font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#dddddd]">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg tracking-tight text-[#222222]">CommitCheck</span>
                <span className="text-[11px] font-medium text-[#6a6a6a] tracking-wider uppercase -mt-1">
                  Client Audit Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {session.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt={session.name || "Client Avatar"}
                  className="w-9 h-9 rounded-full object-cover border border-[#dddddd]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#f7f7f7] border border-[#dddddd] flex items-center justify-center text-xs font-bold text-[#ff385c]">
                  {(session.name || session.email).substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-semibold text-[#222222]">{session.name || session.email}</span>
                <span className="text-xs text-[#6a6a6a]">{session.email}</span>
              </div>
            </div>

            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#fff0f3] text-[#ff385c] border border-[#ffd1da]">
              CLIENT
            </span>

            <a
              href="/api/auth/logout"
              className="p-2 text-[#6a6a6a] hover:text-[#222222] transition-colors rounded-full hover:bg-[#f7f7f7]"
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
        <div className="pb-8 mb-8 border-b border-[#dddddd] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
                Executive Oversight
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Verified Authenticated
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#222222]">
              Deliverable Verification & Code Audits
            </h1>
            <p className="text-sm text-[#6a6a6a] mt-1">
              Verify whether deliverables claimed complete in Linear are backed by verifiable code commits in GitHub.
            </p>
          </div>
        </div>

        {activeProject && pendingScopeCount > 0 && (
          <div className="mb-8 p-6 rounded-[14px] bg-[#fff8e6] border border-[#fde68a] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#fef3c7] text-[#b45309] font-bold text-lg flex items-center justify-center shrink-0">
                ?
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#78350f]">
                  Scope Confirmation Required ({pendingScopeCount} Pending {pendingScopeCount === 1 ? "Item" : "Items"})
                </h3>
                <p className="text-xs text-[#92400e] mt-1 leading-relaxed max-w-2xl">
                  Your freelancer staged tentative or suggested deliverables from your recent call.
                  Review and confirm them before they enter development and billing.
                </p>
              </div>
            </div>
            <Link
              href={`/client/projects/${activeProject.id}/scope-confirmation`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-sm transition-all"
            >
              Review & Confirm Scope
            </Link>
          </div>
        )}

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
          <div className="rounded-[14px] border border-dashed border-[#dddddd] bg-[#f7f7f7] p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-white border border-[#dddddd] flex items-center justify-center mx-auto mb-4 text-[#ff385c]">
                <ShieldCheck className="w-6 h-6 text-[#ff385c]" />
              </div>
              <h3 className="text-lg font-semibold text-[#222222] mb-1">
                No Active Projects Assigned Yet
              </h3>
              <p className="text-sm text-[#6a6a6a] mb-6">
                When your freelancer binds this email ({session.email}) to a project, the real-time code verification dashboard and discrepancy alerts will appear here.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#dddddd] text-xs font-medium text-[#222222]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Client Portal Ready
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
