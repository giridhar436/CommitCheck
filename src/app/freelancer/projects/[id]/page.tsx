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
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col selection:bg-[#ff385c] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/freelancer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors bg-surface-inset hover:bg-surface-raised px-3 py-1.5 rounded-full border border-border"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Projects
            </Link>
            <span className="text-border-strong">/</span>
            <span className="text-sm font-bold text-ink truncate max-w-xs sm:max-w-md">
              {project.title}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ff385c] flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight hidden sm:inline text-ink">CommitCheck</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] mx-auto px-6 py-10 w-full space-y-12">
        {/* Project Header */}
        <div className="pb-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-bg text-success-text border border-success-border">
                <span className="w-1.5 h-1.5 rounded-full bg-success-dot"></span>
                {project.status}
              </span>
              <span className="text-xs text-ink-muted flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Created {new Date(project.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
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
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-surface-raised border border-border text-xs font-mono text-ink shadow-xs">
              <GitBranch className="w-3.5 h-3.5 text-ink-muted" />
              {project.githubRepo}
            </div>
          </div>
        </div>

        {/* Project Metadata Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-ink" />
                Bound Repository
              </span>
              <div className="flex items-center gap-2 my-2 font-mono text-sm font-semibold text-ink">
                {project.githubRepo}
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-2 pt-2 border-t border-border-soft">
              Read access verified via GitHub OAuth integration.
            </p>
          </div>

          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-ink" />
                Client Stakeholder
              </span>
              <div className="flex items-center gap-2 my-2 text-sm font-semibold text-ink">
                {project.clientEmail || "Not assigned"}
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-2 pt-2 border-t border-border-soft">
              Client has view permissions for audit reports and scope confirmation.
            </p>
          </div>

          <div className="p-6 rounded-[14px] border border-border bg-surface-raised saas-card-hover flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-ink" />
                Linear Project
              </span>
              <div className="flex items-center gap-2 my-2 text-sm font-semibold text-ink">
                {project.linearProjectUrl ? (
                  <a
                    href={project.linearProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#ff385c] hover:underline flex items-center gap-1.5"
                  >
                    {project.title} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-ink-faint font-medium">Pending Scope Sync</span>
                )}
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-2 pt-2 border-t border-border-soft">
              {project.linearProjectUrl
                ? "Published and tracked in your Linear workspace."
                : "Tasks publish to Linear once scope review is approved."}
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
        <div className="pt-8 border-t border-border">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
                Verification Self-Check
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-inset text-ink-muted border border-border">
                Freelancer Sandbox Preview
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Code Audit & Deliverable Verification
            </h2>
            <p className="text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
              Test how your current GitHub commits align with Linear tasks, detect ghost completions early, and verify deliverables before client review.
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
