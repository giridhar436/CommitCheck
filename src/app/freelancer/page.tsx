import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Plus,
  GitBranch,
  Layers,
  Video,
  LogOut,
  CheckCircle2,
  Calendar,
  Mail,
  ArrowRight,
  Settings,
  Activity,
} from "lucide-react";
import { PublicFooter } from "@/components/layout/public-footer";
import { EmptyState } from "@/components/ui/empty-state";

export default async function FreelancerDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?auth=required&role=FREELANCER");
  }

  if (session.role !== "FREELANCER") {
    redirect("/client");
  }

  const user = await defaultUserRepository.findById(session.userId);
  const projects = await defaultProjectRepository.listProjectsForFreelancer(session.userId);

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
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-surface-inset text-ink-muted border border-border">
                Freelancer
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
                  alt={session.name || "Freelancer Avatar"}
                  className="w-7 h-7 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-surface-inset border border-border flex items-center justify-center text-xs font-bold text-ink">
                  {(session.name || session.email).substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-ink leading-tight">
                  {session.name || session.email}
                </span>
                <span className="text-[10px] text-ink-muted">
                  @{user?.githubUsername || "developer"}
                </span>
              </div>
            </div>

            <span className="hidden md:inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full bg-surface-inset text-ink border border-border">
              FREELANCER
            </span>

            <Link
              href="/freelancer/settings"
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
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-8 border-b border-border gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Developer Command Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Welcome back, {session.name?.split(" ")[0] || "Developer"}
            </h1>
            <p className="text-sm text-ink-muted mt-1 max-w-xl">
              Manage client engagements, dispatch autonomous meeting bots, and sync AI-curated deliverables into Linear.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/freelancer/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-[8px] transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </div>
        </div>

        {/* Integration Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* GitHub Status */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-ink" />
                  GitHub Integration
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-text bg-success-bg px-2 py-0.5 rounded-full border border-success-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-dot"></span>
                  Connected
                </span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-9 h-9 rounded-lg bg-surface-inset border border-border flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-ink" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-ink block">
                    {user?.githubUsername ? `@${user.githubUsername}` : "GitHub Connected"}
                  </span>
                  <span className="text-xs text-ink-muted">OAuth App Access Active</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-3 pt-3 border-t border-border-soft">
              Repository commit AST diff analysis enabled.
            </p>
          </div>

          {/* Linear Status */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-ink" />
                  Linear Workspace
                </span>
                {user?.linearAccessToken ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-text bg-success-bg px-2 py-0.5 rounded-full border border-success-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-dot"></span>
                    Connected
                  </span>
                ) : (
                  <Link
                    href="/freelancer/settings"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rausch-text bg-rausch-bg px-2 py-0.5 rounded-full border border-rausch-border hover:opacity-80 transition-opacity"
                  >
                    Connect Linear →
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-9 h-9 rounded-lg bg-surface-inset border border-border flex items-center justify-center">
                  <Layers className="w-4 h-4 text-ink" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-ink block">
                    {user?.linearWorkspaceName || "Not Connected"}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {user?.linearAccessToken ? "Ready to sync scoped tasks" : "Requires API Key"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-soft">
              <span className="text-xs text-ink-muted">
                {user?.linearAccessToken ? "Auto-issue staging enabled" : "Configure in settings"}
              </span>
              <Link
                href="/freelancer/settings"
                className="text-xs font-semibold text-ink hover:text-[#ff385c] transition-colors"
              >
                Settings →
              </Link>
            </div>
          </div>

          {/* Meeting Bot Infrastructure */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-ink" />
                  Meeting Bot
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink bg-surface-inset px-2 py-0.5 rounded-full border border-border">
                  Recall.ai Pipeline
                </span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-9 h-9 rounded-lg bg-surface-inset border border-border flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#ff385c]" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-ink block">
                    Autonomous Dispatcher
                  </span>
                  <span className="text-xs text-ink-muted">Google Meet Audio & Diarization</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-3 pt-3 border-t border-border-soft">
              Live transcription & Gemini scope extraction ready.
            </p>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Active Engagements
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-inset text-ink text-xs font-semibold border border-border">
              {projects.length}
            </span>
          </div>

          {projects.length > 0 && (
            <Link
              href="/freelancer/projects/new"
              className="text-xs font-semibold text-[#ff385c] hover:text-[#e00b41] transition-colors flex items-center gap-1"
            >
              + Create new project
            </Link>
          )}
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between"
              >
                <div>
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

                  <h3 className="text-lg font-bold text-ink mb-1.5 hover:text-[#ff385c] transition-colors">
                    <Link href={`/freelancer/projects/${project.id}`}>
                      {project.title}
                    </Link>
                  </h3>

                  {project.description && (
                    <p className="text-xs text-ink-muted mb-4 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-2.5 my-4 pt-3.5 border-t border-border-soft text-xs">
                    <div className="flex items-center gap-2 text-ink">
                      <GitBranch className="w-4 h-4 text-ink-muted" />
                      <span className="font-mono bg-surface-inset px-2.5 py-0.5 rounded border border-border text-[11px]">
                        {project.githubRepo}
                      </span>
                    </div>

                    {project.clientEmail && (
                      <div className="flex items-center gap-2 text-ink-muted">
                        <Mail className="w-4 h-4 text-ink-muted" />
                        <span>Client: <strong className="text-ink font-medium">{project.clientEmail}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between mt-2">
                  <div className="text-[11px] text-ink-muted flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success-text" />
                    Repository Bound
                  </div>
                  <Link
                    href={`/freelancer/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-canvas bg-ink hover:opacity-90 px-3.5 py-1.5 rounded-[6px] transition-opacity"
                  >
                    Open Workspace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={GitBranch}
            title="No Projects Bound Yet"
            description="Create your first project to bind an authorized GitHub repository and invite your client to verified audits."
            actionText="Initialize First Project"
            actionHref="/freelancer/projects/new"
            secondaryActionText="Read Onboarding Walkthrough"
            secondaryActionHref="/onboarding"
          />
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
