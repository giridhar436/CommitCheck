import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import {
  ArrowLeft,
  ShieldCheck,
  GitBranch,
  Video,
  Mail,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?auth=required&role=FREELANCER");
  }

  if (session.role !== "FREELANCER") {
    redirect("/client");
  }

  const { id } = await params;
  const project = await defaultProjectRepository.findProjectById(id);

  if (!project || project.freelancerId !== session.userId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#dddddd]">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/freelancer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#222222] hover:text-[#6a6a6a] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ff385c] flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm">CommitCheck</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] mx-auto px-6 py-10 w-full">
        {/* Project Header */}
        <div className="pb-8 mb-8 border-b border-[#dddddd] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {project.status}
              </span>
              <span className="text-xs text-[#6a6a6a] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#222222]">{project.title}</h1>
            {project.description && (
              <p className="text-sm text-[#6a6a6a] mt-1">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#f7f7f7] border border-[#dddddd] text-xs font-mono text-[#222222]">
              <GitBranch className="w-3.5 h-3.5 text-[#6a6a6a]" />
              {project.githubRepo}
            </div>
          </div>
        </div>

        {/* Project Metadata & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Bound Repository</span>
            <div className="flex items-center gap-2 my-2 font-mono text-sm text-[#222222]">
              <GitBranch className="w-4 h-4 text-[#222222]" />
              {project.githubRepo}
            </div>
            <p className="text-xs text-[#6a6a6a]">
              Read access verified via your GitHub OAuth account.
            </p>
          </div>

          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Client Stakeholder</span>
            <div className="flex items-center gap-2 my-2 text-sm text-[#222222]">
              <Mail className="w-4 h-4 text-[#6a6a6a]" />
              {project.clientEmail || "Not assigned"}
            </div>
            <p className="text-xs text-[#6a6a6a]">
              Client has view permissions for audit reports and milestones.
            </p>
          </div>

          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Linear Project</span>
            <div className="flex items-center gap-2 my-2 text-sm text-[#222222]">
              <Layers className="w-4 h-4 text-[#6a6a6a]" />
              {project.linearProjectId || "Not Synced Yet"}
            </div>
            <p className="text-xs text-[#6a6a6a]">
              Tasks will be published upon scope review approval.
            </p>
          </div>
        </div>

        {/* Meeting Bot & Scope Staging Section (Ready for VAR-9 & VAR-10) */}
        <div className="rounded-[14px] border border-[#dddddd] bg-[#f7f7f7] p-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
              Upcoming: Meeting Bot Dispatch (Ticket 4 / VAR-9)
            </div>
            <h3 className="text-lg font-semibold text-[#222222] mb-2">
              Ready to Record Your Discovery Call?
            </h3>
            <p className="text-sm text-[#6a6a6a] mb-6">
              In Ticket 4 (VAR-9), you will paste your Google Meet link here to dispatch our Recall.ai meeting bot, record commitments, and generate a verified scope transcript.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-[#6a6a6a]">
              <Video className="w-4 h-4" />
              <span>Google Meet Bot Dispatch ready for Ticket 4</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
