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
                  Freelancer Workspace
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
                  alt={session.name || "Freelancer Avatar"}
                  className="w-9 h-9 rounded-full object-cover border border-[#dddddd]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#f7f7f7] border border-[#dddddd] flex items-center justify-center text-xs font-bold text-[#222222]">
                  {(session.name || session.email).substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-semibold text-[#222222]">{session.name || session.email}</span>
                <span className="text-xs text-[#6a6a6a]">@{user?.githubUsername || "developer"}</span>
              </div>
            </div>

            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#f7f7f7] text-[#222222] border border-[#dddddd]">
              FREELANCER
            </span>

            <Link
              href="/freelancer/settings"
              className="p-2 text-[#6a6a6a] hover:text-[#222222] transition-colors rounded-full hover:bg-[#f7f7f7]"
              title="Workspace Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>

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
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-8 border-b border-[#dddddd] gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#222222]">
              Welcome back, {session.name?.split(" ")[0] || "Developer"}
            </h1>
            <p className="text-sm text-[#6a6a6a] mt-1">
              Manage your client projects, dispatch meeting bots, and sync approved scope to Linear.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/freelancer/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-[8px] transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </div>
        </div>

        {/* Integration Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">GitHub Integration</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            </div>
            <div className="flex items-center gap-3 my-2">
              <GitBranch className="w-5 h-5 text-[#222222]" />
              <span className="text-base font-semibold text-[#222222]">
                {user?.githubUsername ? `@${user.githubUsername}` : "GitHub Account"}
              </span>
            </div>
            <p className="text-xs text-[#6a6a6a] mt-2">
              Repository binding & commit analysis active.
            </p>
          </div>

          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Linear Workspace</span>
              {user?.linearAccessToken ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <Link
                  href="/freelancer/settings"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff385c] hover:underline"
                >
                  Connect
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 my-2">
              <Layers className="w-5 h-5 text-[#222222]" />
              <span className="text-base font-semibold text-[#222222]">
                {user?.linearWorkspaceName || "Not Connected"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f7f7f7]">
              <p className="text-xs text-[#6a6a6a]">
                {user?.linearAccessToken ? "Ready to sync scoped tickets" : "Connect your workspace"}
              </p>
              <Link
                href="/freelancer/settings"
                className="text-xs font-medium text-[#222222] hover:text-[#ff385c] underline"
              >
                Settings
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Recall.ai Bot</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6a6a6a] bg-[#f7f7f7] px-2 py-0.5 rounded-full border border-[#dddddd]">
                Ready for VAR-9
              </span>
            </div>
            <div className="flex items-center gap-3 my-2">
              <Video className="w-5 h-5 text-[#222222]" />
              <span className="text-base font-semibold text-[#222222]">Meeting Infrastructure</span>
            </div>
            <p className="text-xs text-[#6a6a6a] mt-2">
              Autonomous recording and live transcription pipeline.
            </p>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#222222]">Active Projects ({projects.length})</h2>
          {projects.length > 0 && (
            <Link
              href="/freelancer/projects/new"
              className="text-xs font-medium text-[#ff385c] hover:underline"
            >
              + Add another project
            </Link>
          )}
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {project.status}
                    </span>
                    <span className="text-xs text-[#6a6a6a] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-[#222222] mb-1">{project.title}</h3>
                  {project.description && (
                    <p className="text-xs text-[#6a6a6a] mb-4 line-clamp-2">{project.description}</p>
                  )}

                  <div className="space-y-2 my-4 pt-3 border-t border-[#f7f7f7] text-xs">
                    <div className="flex items-center gap-2 text-[#222222]">
                      <GitBranch className="w-4 h-4 text-[#6a6a6a]" />
                      <span className="font-mono bg-[#f7f7f7] px-2 py-0.5 rounded border border-[#dddddd]">
                        {project.githubRepo}
                      </span>
                    </div>

                    {project.clientEmail && (
                      <div className="flex items-center gap-2 text-[#6a6a6a]">
                        <Mail className="w-4 h-4 text-[#6a6a6a]" />
                        <span>Client: {project.clientEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#dddddd] flex items-center justify-between mt-2">
                  <div className="text-[11px] text-[#6a6a6a]">
                    Repository Bound & Verified
                  </div>
                  <Link
                    href={`/freelancer/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff385c] hover:text-[#e00b41]"
                  >
                    View Project
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
