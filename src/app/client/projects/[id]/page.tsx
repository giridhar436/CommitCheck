import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentSession } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { defaultAuditRepository } from "@/lib/audit";
import { defaultTaskDraftRepository } from "@/lib/scope";
import { ExecutiveAuditDashboard } from "@/app/client/audit-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LogOut,
  CheckCircle2,
  Settings,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  GitBranch,
  Layers,
  Calendar,
} from "lucide-react";
import { PublicFooter } from "@/components/layout/public-footer";

export default async function ClientProjectAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?auth=required&role=CLIENT");
  }

  if (session.role !== "CLIENT") {
    redirect("/freelancer");
  }

  const { id } = await params;
  const project = await defaultProjectRepository.findProjectById(id);

  if (!project) {
    notFound();
  }

  // Enforce client authorization
  const isAuthorized =
    project.clientId === session.userId ||
    (typeof project.clientEmail === "string" &&
      project.clientEmail.toLowerCase() === session.email.toLowerCase());

  if (!isAuthorized) {
    redirect("/client");
  }

  const rawReport = await defaultAuditRepository.findLatestReportForProject(project.id);
  const initialReport = rawReport
    ? {
        ...rawReport,
        createdAt: rawReport.createdAt.toISOString(),
      }
    : null;

  const rawHistory = await defaultAuditRepository.listReportsForProject(project.id);
  const history = rawHistory.map((h) => ({
    ...h,
    createdAt: h.createdAt.toISOString(),
  }));

  const drafts = await defaultTaskDraftRepository.listDraftsForProject(project.id);
  const pendingScopeCount = drafts.filter(
    (d) =>
      d.clientApprovalStatus === "PENDING_CLIENT_APPROVAL" &&
      d.status !== "DISCARDED" &&
      d.status !== "SYNCED"
  ).length;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-[#ff385c] selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/client"
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
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Link
            href="/client"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to All Projects
          </Link>
        </div>

        {/* Project Header */}
        <div className="pb-8 mb-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff385c] animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
                Verified Engagement
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-text bg-success-bg px-2 py-0.5 rounded-full border border-success-border">
                <CheckCircle2 className="w-3 h-3 text-success-dot" />
                {project.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              {project.title}
            </h1>
            {project.description && (
              <p className="text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-ink-muted">
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-ink-muted" />
                <span className="font-mono text-ink bg-surface-inset px-2 py-0.5 rounded border border-border">
                  {project.githubRepo}
                </span>
              </div>

              {project.linearProjectUrl && (
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-ink-muted" />
                  <a
                    href={project.linearProjectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[#ff385c] hover:underline"
                  >
                    Linear Workspace →
                  </a>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                <span>
                  Created{" "}
                  {new Date(project.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Scope Confirmation Alert Banner */}
        {pendingScopeCount > 0 && (
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
              href={`/client/projects/${project.id}/scope-confirmation`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-sm hover:shadow transition-all"
            >
              Review & Confirm Scope
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Executive Audit Dashboard */}
        <ExecutiveAuditDashboard
          project={{
            id: project.id,
            title: project.title,
            description: project.description,
            githubRepo: project.githubRepo,
            linearProjectId: project.linearProjectId,
            linearProjectUrl: project.linearProjectUrl || null,
            clientEmail: project.clientEmail,
            createdAt: project.createdAt.toISOString(),
          }}
          initialReport={initialReport}
          history={history}
          auditorRole="CLIENT"
        />
      </main>

      <PublicFooter />
    </div>
  );
}
