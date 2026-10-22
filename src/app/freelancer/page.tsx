import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import {
  ShieldCheck,
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
  FolderGit2,
  ExternalLink,
} from "lucide-react";

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
    <div className="min-h-screen bg-[#fafafa] text-[#18181b] flex flex-col font-sans selection:bg-[#ff385c] selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e4e4e7]">
        <div className="max-w-[1280px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg tracking-tight text-[#18181b] flex items-center gap-2">
                  CommitCheck
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]">
                    Workspace
                  </span>
                </span>
                <span className="text-[11px] font-medium text-[#71717a] tracking-wider uppercase -mt-0.5">
                  Freelancer Hub
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-[#e4e4e7] shadow-xs">
              {session.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt={session.name || "Freelancer Avatar"}
                  className="w-7 h-7 rounded-full object-cover border border-[#e4e4e7]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center text-xs font-bold text-[#18181b]">
                  {(session.name || session.email).substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#18181b] leading-tight">
                  {session.name || session.email}
                </span>
                <span className="text-[10px] text-[#71717a]">
                  @{user?.githubUsername || "developer"}
                </span>
              </div>
            </div>

            <span className="hidden md:inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
              FREELANCER
            </span>

            <Link
              href="/freelancer/settings"
              className="p-2 text-[#71717a] hover:text-[#18181b] transition-colors rounded-full hover:bg-[#f4f4f5] border border-transparent hover:border-[#e4e4e7]"
              title="Workspace Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>

            <a
              href="/api/auth/logout"
              className="p-2 text-[#71717a] hover:text-[#18181b] transition-colors rounded-full hover:bg-[#f4f4f5] border border-transparent hover:border-[#e4e4e7]"
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
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-8 border-b border-[#e4e4e7] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                Developer Command Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181b]">
              Welcome back, {session.name?.split(" ")[0] || "Developer"}
            </h1>
            <p className="text-sm text-[#71717a] mt-1 max-w-xl">
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
          <div className="p-6 rounded-[14px] border border-[#e4e4e7] bg-white saas-card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#71717a] flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[#18181b]" />
                  GitHub Integration
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Connected
                </span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-9 h-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-[#18181b]" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-[#18181b] block">
                    {user?.githubUsername ? `@${user.githubUsername}` : "GitHub Connected"}
                  </span>
                  <span className="text-xs text-[#71717a]">OAuth App Access Active</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#71717a] mt-3 pt-3 border-t border-[#f4f4f5]">
              Repository commit AST diff analysis enabled.
            </p>
          </div>

          {/* Linear Status */}
          <div className="p-6 rounded-[14px] border border-[#e4e4e7] bg-white saas-card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#71717a] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#18181b]" />
                  Linear Workspace
                </span>
                {user?.linearAccessToken ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connected
                  </span>
                ) : (
                  <Link
                    href="/freelancer/settings"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff385c] bg-[#fff0f3] px-2 py-0.5 rounded-full border border-[#ffd1da] hover:bg-[#ffe4e9] transition-colors"
                  >
                    Connect Linear →
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-9 h-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center">
                  <Layers className="w-4 h-4 text-[#18181b]" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-[#18181b] block">
                    {user?.linearWorkspaceName || "Not Connected"}
                  </span>
                  <span className="text-xs text-[#71717a]">
                    {user?.linearAccessToken ? "Ready to sync scoped tasks" : "Requires API Key"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f4f4f5]">
              <span className="text-xs text-[#71717a]">
                {user?.linearAccessToken ? "Auto-issue staging enabled" : "Configure in settings"}
              </span>
              <Link
                href="/freelancer/settings"
                className="text-xs font-semibold text-[#18181b] hover:text-[#ff385c] transition-colors"
              >
                Settings →
              </Link>
            </div>
          </div>

          {/* Meeting Bot Infrastructure */}
          <div className="p-6 rounded-[14px] border border-[#e4e4e7] bg-white saas-card-hover flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#71717a] flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#18181b]" />
                  Meeting Bot
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#18181b] bg-[#f4f4f5] px-2 py-0.5 rounded-full border border-[#e4e4e7]">
                  Recall.ai Pipeline
                </span>
              </div>
              <div className="flex items-center gap-3 my-2">
                <div className="w-9 h-9 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#ff385c]" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-[#18181b] block">
                    Autonomous Dispatcher
                  </span>
                  <span className="text-xs text-[#71717a]">Google Meet Audio & Diarization</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#71717a] mt-3 pt-3 border-t border-[#f4f4f5]">
              Live transcription & Gemini scope extraction ready.
            </p>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#18181b]">
              Active Engagements
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#f4f4f5] text-[#18181b] text-xs font-semibold border border-[#e4e4e7]">
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
                className="p-6 rounded-[14px] border border-[#e4e4e7] bg-white saas-card-hover flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {project.status}
                    </span>
                    <span className="text-xs text-[#71717a] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#18181b] mb-1.5 hover:text-[#ff385c] transition-colors">
                    <Link href={`/freelancer/projects/${project.id}`}>
                      {project.title}
                    </Link>
                  </h3>

                  {project.description && (
                    <p className="text-xs text-[#71717a] mb-4 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-2.5 my-4 pt-3.5 border-t border-[#f4f4f5] text-xs">
                    <div className="flex items-center gap-2 text-[#18181b]">
                      <GitBranch className="w-4 h-4 text-[#71717a]" />
                      <span className="font-mono bg-[#f4f4f5] px-2.5 py-0.5 rounded border border-[#e4e4e7] text-[11px]">
                        {project.githubRepo}
                      </span>
                    </div>

                    {project.clientEmail && (
                      <div className="flex items-center gap-2 text-[#71717a]">
                        <Mail className="w-4 h-4 text-[#71717a]" />
                        <span>Client: <strong className="text-[#18181b] font-medium">{project.clientEmail}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e4e4e7] flex items-center justify-between mt-2">
                  <div className="text-[11px] text-[#71717a] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Repository Bound
                  </div>
                  <Link
                    href={`/freelancer/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#18181b] hover:bg-black px-3.5 py-1.5 rounded-[6px] transition-colors"
                  >
                    Open Workspace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#e4e4e7] bg-white p-12 md:p-16 text-center shadow-xs">
            <div className="max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-[#fafafa] border border-[#e4e4e7] flex items-center justify-center mx-auto mb-4 text-[#18181b] shadow-xs">
                <FolderGit2 className="w-7 h-7 text-[#71717a]" />
              </div>
              <h3 className="text-xl font-bold text-[#18181b] mb-2">
                No Projects Bound Yet
              </h3>
              <p className="text-sm text-[#71717a] mb-6 leading-relaxed">
                Initialize your first project to bind a GitHub repository, invite your client for verification, and dispatch meeting bots for scope freeze.
              </p>
              <Link
                href="/freelancer/projects/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-semibold text-sm transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Initialize First Project
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
