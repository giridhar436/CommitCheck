import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Sparkles,
  FileCheck2,
  ClipboardCheck,
  CircleX,
  FilePenLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/risk-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { MetricCard } from '@/components/dashboard/metric-card'
import { ProjectNavTabs } from '@/components/projects/project-nav-tabs'
import { NeedsAttention } from '@/components/dashboard/needs-attention'
import { RecentCommitmentsCard } from '@/components/dashboard/recent-commitments-card'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { projectService } from '@/services/projects'
import { commitmentService } from '@/services/commitments'
import { dashboardService } from '@/services/dashboard'
import { deriveProjectRiskLevel } from '@/services/api/adapters'
import { formatDate, formatActivityAction } from '@/lib/utils'
import type { Project, Commitment, DashboardData } from '@/types'

export function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    // The dashboard aggregate (Phase 12) supplies every number, the
    // attention section and the audit timeline; commitments are still
    // fetched separately for the recent-commitments table.
    Promise.all([
      projectService.getById(id),
      dashboardService.getOverview(id).catch(() => null),
      commitmentService.getAll(id),
    ]).then(([proj, dash, commList]) => {
      setProject(proj)
      setDashboard(dash)
      setCommitments(commList)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return <LoadingState message="Loading project overview..." />
  }

  if (!project) {
    return (
      <ErrorState
        title="Project Not Found"
        message="The requested client project could not be located."
        action={
          <Button onClick={() => navigate('/projects')} size="sm">
            Back to Projects
          </Button>
        }
      />
    )
  }

  const summary = dashboard?.summary
  const riskLevel = summary
    ? deriveProjectRiskLevel(summary.unauthorizedCommitments, summary.commitments)
    : project.riskLevel

  const timelineItems = (dashboard?.recentActivity ?? []).map((act) => ({
    id: act.id,
    timestamp: act.createdAt,
    title: act.entityTitle ?? formatActivityAction(act.action),
    description: act.description,
    badge:
      act.action === 'COMMITMENT_FLAGGED'
        ? 'unauthorized'
        : act.action === 'CHANGE_REQUEST_CREATED' || act.action === 'CHANGE_REQUEST_CLARIFICATION_REQUESTED'
        ? 'pending_approval'
        : undefined,
  }))

  const attentionEntries = (dashboard?.attentionItems ?? []).map((item) => ({
    ...item,
    projectId: project.id,
    projectName: project.name,
  }))

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Project Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
            <RiskBadge level={riskLevel} />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>Client: <strong className="text-foreground">{project.client}</strong></span>
            {project.budget && (
              <>
                <span>•</span>
                <span>Budget: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{project.budget}</strong></span>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
              Started {formatDate(project.startDate)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground max-w-2xl pt-1 leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}/scope`)}
            className="text-xs h-9"
          >
            <FileCheck2 className="mr-1.5 h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
            Approved Scope
          </Button>

          <Button
            size="sm"
            onClick={() => navigate(`/projects/${project.id}/meetings`)}
            className="text-xs h-9 font-semibold shadow-xs"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.8} />
            Analyze Meeting
          </Button>
        </div>
      </div>

      {/* Project Sub-Navigation Tabs */}
      <ProjectNavTabs projectId={project.id} />

      {/* Overview Metrics Cards — live from the dashboard aggregate */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Approved Scope"
          value={summary ? summary.scopeRequirements : '…'}
          description="Signed SOW deliverables"
          icon={FileCheck2}
          variant="default"
          actionLabel="Inspect"
          onAction={() => navigate(`/projects/${project.id}/scope`)}
        />

        <MetricCard
          title="Detected Commitments"
          value={summary ? summary.commitments : '…'}
          description="From analyzed meetings"
          icon={ClipboardCheck}
          variant="default"
          actionLabel="View"
          onAction={() => navigate(`/projects/${project.id}/commitments`)}
        />

        <MetricCard
          title="Unauthorized Scope"
          value={summary ? summary.unauthorizedCommitments : '…'}
          description="Missing change requests"
          icon={CircleX}
          variant={summary && summary.unauthorizedCommitments > 0 ? 'danger' : 'default'}
          actionLabel="Review"
          onAction={() => navigate(`/projects/${project.id}/commitments`)}
        />

        <MetricCard
          title="Pending Change Orders"
          value={summary ? summary.pendingChangeRequests : '…'}
          description="Awaiting client sign-off"
          icon={FilePenLine}
          variant={summary && summary.pendingChangeRequests > 0 ? 'warning' : 'default'}
          actionLabel="Review"
          onAction={() => navigate(`/projects/${project.id}/change-requests`)}
        />
      </div>

      {/* Main Grid: Needs Attention & Commitments on Left, Audit Activity on Right */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attention section from the backend's attentionItems */}
          <NeedsAttention items={attentionEntries} />

          {/* Commitments Table */}
          <RecentCommitmentsCard commitments={commitments} />
        </div>

        {/* Right 1 Column: Activity Timeline & Details */}
        <div className="space-y-6">
          {/* Audit Timeline — real backend activity, newest first */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">
                  Project Audit Timeline
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground"
                  onClick={() => navigate(`/projects/${project.id}/activity`)}
                >
                  Full Timeline
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <ActivityTimeline items={timelineItems} />
            </CardContent>
          </Card>

          {/* Quick Scope Verification Checklist Card */}
          <Card className="border-border/80 shadow-xs bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                Verification Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Any promise made in calls must match approved clauses in SOW Section 3.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Unmatched promises are marked <strong className="text-red-500">Unauthorized</strong> until a Change Request is signed.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Engineers must not pick up unapproved scope tickets.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
