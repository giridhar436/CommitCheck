import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import {
  defaultMeetingRepository,
  defaultMeetingBotService,
  reconcileProjectMeetings,
} from "@/lib/meetings";
import { defaultTaskDraftRepository } from "@/lib/scope";
import { defaultLinearService } from "@/lib/linear";
import { defaultAuditRepository } from "@/lib/audit";
import { MeetingSection } from "./meeting-section";
import { ScopeReviewSection } from "./scope-review-section";
import { ExecutiveAuditDashboard } from "@/app/client/audit-dashboard";
import {
  ArrowLeft,
  ShieldCheck,
  GitBranch,
  Mail,
  Calendar,
  Layers,
  ExternalLink,
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

  const user = await defaultUserRepository.findById(session.userId);
  const isLinearConnected = !!user?.linearAccessToken;
  let linearTeams: Array<{ id: string; name: string; key: string }> = [];
  if (isLinearConnected && user?.linearAccessToken) {
    try {
      linearTeams = await defaultLinearService.listTeams(user.linearAccessToken);
    } catch {
      linearTeams = [];
    }
  }

  const rawMeetings = await reconcileProjectMeetings(
    id,
    defaultMeetingRepository,
    defaultMeetingBotService
  );
  const meetings = rawMeetings.map((m) => ({
    id: m.id,
    meetUrl: m.meetUrl,
    status: m.status,
    transcript: m.transcript,
    transcriptJson: m.transcriptJson,
    createdAt: m.createdAt.toISOString(),
  }));

  const rawDrafts = await defaultTaskDraftRepository.listDraftsForProject(id);
  const drafts = rawDrafts.map((d) => ({
    id: d.id,
    meetingId: d.meetingId,
    projectId: d.projectId,
    title: d.title,
    description: d.description,
    priority: d.priority,
    estimate: d.estimate,
    status: d.status,
    classification: d.classification,
    clientApprovalStatus: d.clientApprovalStatus,
    evidence: d.evidence,
    confidence: d.confidence,
    suggestedMilestone: d.suggestedMilestone,
    linearIssueId: d.linearIssueId,
    linearIssueKey: d.linearIssueKey,
    linearIssueUrl: d.linearIssueUrl,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  const activeMeetingWithTranscript = meetings.find((m) => !!m.transcript);

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
      <main className="flex-1 max-w-[1280px] mx-auto px-6 py-10 w-full space-y-12">
        {/* Project Header */}
        <div className="pb-8 border-b border-[#dddddd] flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        {/* Project Metadata Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <Layers className="w-4 h-4 text-[#ff385c]" />
              {project.linearProjectUrl ? (
                <a
                  href={project.linearProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#ff385c] hover:underline flex items-center gap-1"
                >
                  {project.title} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-[#6a6a6a]">Not Synced Yet</span>
              )}
            </div>
            <p className="text-xs text-[#6a6a6a]">
              {project.linearProjectUrl
                ? "Published and tracked in your Linear workspace."
                : "Tasks will be published upon scope review approval."}
            </p>
          </div>
        </div>

        {/* Meeting Bot Section */}
        <MeetingSection projectId={project.id} initialMeetings={meetings} />

        {/* AI Scope Extraction & Pre-Publish Review Staging */}
        <ScopeReviewSection
          projectId={project.id}
          meetingId={activeMeetingWithTranscript?.id || meetings[0]?.id || null}
          initialDrafts={drafts}
          hasTranscript={!!activeMeetingWithTranscript}
          isLinearConnected={isLinearConnected}
          linearTeams={linearTeams}
          initialLinearProjectId={project.linearProjectId}
          initialLinearProjectUrl={project.linearProjectUrl}
        />

        {/* Audit & Self-Check Section */}
        <div className="pt-8 border-t border-[#dddddd]">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
                Verification Self-Check
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f7f7f7] text-[#6a6a6a] border border-[#dddddd]">
                Freelancer Preview
              </span>
            </div>
            <h2 className="text-xl font-semibold text-[#222222]">
              Code Audit & Deliverable Verification
            </h2>
            <p className="text-sm text-[#6a6a6a] mt-1">
              Test how your current GitHub commits align with Linear tasks, detect any ghost completions early, and run verification audits before client review.
            </p>
          </div>

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
            auditorRole="FREELANCER_SELF_CHECK"
          />
        </div>
      </main>
    </div>
  );
}
