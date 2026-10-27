import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentSession } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultAuditRepository } from "@/lib/audit";
import { defaultTaskDraftRepository } from "@/lib/scope";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ShieldCheck,
  LogOut,
  CheckCircle2,
  Settings,
  ArrowRight,
  HelpCircle,
  GitBranch,
  Layers,
  Calendar,
} from "lucide-react";
import { PublicFooter } from "@/components/layout/public-footer";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ project?: string }>;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?auth=required&role=CLIENT");
  }

  if (session.role !== "CLIENT") {
    redirect("/freelancer");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (resolvedSearchParams?.project) {
    redirect(`/client/projects/${resolvedSearchParams.project}`);
  }

  // Retrieve ALL projects belonging to the authenticated client
  const projects = await defaultProjectRepository.listProjectsForClient(session.email);

  // Load audit summaries and pending scope counts for every project in parallel
  const projectCardsData = await Promise.all(
    projects.map(async (project) => {
      const [rawReport, drafts] = await Promise.all([
        defaultAuditRepository.findLatestReportForProject(project.id),
        defaultTaskDraftRepository.listDraftsForProject(project.id),
      ]);

      const pendingScopeCount = drafts.filter(
        (d) =>
          d.clientApprovalStatus === "PENDING_CLIENT_APPROVAL" &&
          d.status !== "DISCARDED" &&
          d.status !== "SYNCED"
      ).length;

      return {
        project,
        latestReport: rawReport
          ? {
              ...rawReport,
              createdAt: rawReport.createdAt.toISOString(),
            }
          : null,
        pendingScopeCount,
      };
    })
  );

  const totalPendingScope = projectCardsData.reduce(
    (acc, curr) => acc + curr.pendingScopeCount,
    0
  );

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-[#ff385c] selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[#ff385c] rounded-[8px] p-1"
              aria-label="CommitCheck Home"
            >
              <Image
                src="/branding/logo-180x48.svg"
                alt="CommitCheck"
                width={180}
                height={48}
                className="h-8 w-auto"
                priority
              />
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-rausch-bg text-rausch-text border border-rausch-border">
                Client Audit
              </span>
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

            <Link
              href="/client/settings"
              className="p-2 text-ink-muted hover:text-ink transition-colors rounded-full hover:bg-surface-inset border border-transparent hover:border-border"
              title="Workspace Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>

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

        {/* Global Pending Scope Confirmation Alert Banner if any project has items */}
        {totalPendingScope > 0 && (
          <div className="mb-8 p-6 rounded-[14px] bg-warning-bg border border-warning-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-warning-bg text-warning-text font-bold text-base flex items-center justify-center shrink-0 border border-warning-border">
                <HelpCircle className="w-5 h-5 text-warning-text" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warning-text flex items-center gap-2">
                  Scope Confirmation Required
                  <span className="px-2 py-0.5 rounded-full bg-surface-raised text-warning-text text-[11px] font-semibold border border-warning-border">
                    {totalPendingScope} Pending {totalPendingScope === 1 ? "Item" : "Items"}
                  </span>
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed max-w-2xl">
                  Your freelancer staged tentative or suggested deliverables from your recent calls.
                  Review and confirm them before they enter approved development scope.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Projects Section Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Active Engagements
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-inset text-ink text-xs font-semibold border border-border">
              {projects.length}
            </span>
          </div>
        </div>

        {/* Projects Grid or Empty State */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projectCardsData.map(({ project, latestReport, pendingScopeCount }) => (
              <div
                key={project.id}
                className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between"
              >
                <div>
                  {/* Status & Date */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-bg text-success-text border border-success-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-success-dot"></span>
                      {project.status}
                    </span>
                    <span className="text-xs text-ink-muted flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Project Title */}
                  <h3 className="text-lg font-bold text-ink mb-1.5 hover:text-[#ff385c] transition-colors">
                    <Link href={`/client/projects/${project.id}`}>
                      {project.title}
                    </Link>
                  </h3>

                  {/* Description */}
                  {project.description && (
                    <p className="text-xs text-ink-muted mb-4 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Project Metadata */}
                  <div className="space-y-2.5 my-4 pt-3.5 border-t border-border-soft text-xs">
                    <div className="flex items-center gap-2 text-ink">
                      <GitBranch className="w-4 h-4 text-ink-muted" />
                      <span className="font-mono bg-surface-inset px-2.5 py-0.5 rounded border border-border text-[11px]">
                        {project.githubRepo}
                      </span>
                    </div>

                    {project.linearProjectUrl && (
                      <div className="flex items-center gap-2 text-ink-muted">
                        <Layers className="w-4 h-4 text-ink-muted" />
                        <span className="font-medium text-ink">Linear Project Synced</span>
                      </div>
                    )}
                  </div>

                  {/* Pending Scope Alert in Card */}
                  {pendingScopeCount > 0 && (
                    <div className="mb-4 p-3 rounded-[8px] bg-warning-bg border border-warning-border flex items-center justify-between text-xs text-warning-text">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 shrink-0 text-warning-text" />
                        <span>
                          <strong>{pendingScopeCount}</strong> pending {pendingScopeCount === 1 ? "scope item" : "scope items"}
                        </span>
                      </div>
                      <Link
                        href={`/client/projects/${project.id}/scope-confirmation`}
                        className="font-semibold text-[#ff385c] hover:underline shrink-0"
                      >
                        Confirm Scope →
                      </Link>
                    </div>
                  )}

                  {/* Audit Verification Summary */}
                  <div className="mb-2 p-3 rounded-[8px] bg-surface-inset border border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#ff385c]" />
                      <span className="text-ink font-medium">Code Verification</span>
                    </div>
                    {latestReport ? (
                      <span className="font-bold text-success-text bg-success-bg px-2 py-0.5 rounded-full border border-success-border text-[11px]">
                        {latestReport.verifiedPercentage}% Verified
                      </span>
                    ) : (
                      <span className="text-ink-muted font-medium bg-surface-raised px-2 py-0.5 rounded-full border border-border text-[11px]">
                        Ready for Audit
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-border flex items-center justify-between mt-3">
                  <div className="text-[11px] text-ink-muted flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success-text" />
                    Verified Engagement
                  </div>
                  <Link
                    href={`/client/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-canvas bg-ink hover:opacity-90 px-3.5 py-1.5 rounded-[6px] transition-opacity cursor-pointer"
                  >
                    Open Dashboard
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="No Active Projects Assigned Yet"
            description={`When your freelancer binds this email (${session.email}) to a project, the real-time code verification dashboard and discrepancy alerts will appear here.`}
            secondaryActionText="Read Client Verification Guide"
            secondaryActionHref="/onboarding"
          />
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
