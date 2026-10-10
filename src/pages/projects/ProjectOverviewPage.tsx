import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Sparkles,
  FileCheck,
  ShieldAlert,
  AlertTriangle,
  GitPullRequestDraft,
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
import { activityService } from '@/services/activity'
import { formatDate } from '@/lib/utils'
import type { Project, Commitment, ActivityItem } from '@/types'

export function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    Promise.all([
      projectService.getById(id),
      commitmentService.getAll(id),
      activityService.getAll(id),
    ]).then(([proj, commList, actList]) => {
      setProject(proj)
      setCommitments(commList)
      setActivities(actList)
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

  const timelineItems = activities.map((act) => ({
    id: act.id,
    timestamp: act.timestamp,
    title: act.title,
    description: act.description,
    badge:
      act.type === 'commitment_flagged'
        ? 'unauthorized'
        : act.type === 'change_request_created'
        ? 'pending_approval'
        : undefined,
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
            <RiskBadge level={project.riskLevel} />
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
              <Calendar className="h-3.5 w-3.5" />
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
            <FileCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Approved Scope
          </Button>

          <Button
            size="sm"
            onClick={() => navigate(`/projects/${project.id}/meetings`)}
            className="text-xs h-9 font-semibold shadow-xs"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Analyze Meeting
          </Button>
        </div>
      </div>

      {/* Project Sub-Navigation Tabs */}
      <ProjectNavTabs projectId={project.id} />

      {/* Overview Metrics Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Approved Scope"
          value={project.approvedRequirements}
          description="Signed SOW deliverables"
          icon={FileCheck}
          variant="default"
          actionLabel="Inspect"
          onAction={() => navigate(`/projects/${project.id}/scope`)}
        />

        <MetricCard
          title="Detected Commitments"
          value={project.detectedCommitments}
          description="From analyzed meetings"
          icon={ShieldAlert}
          variant="default"
          actionLabel="View"
          onAction={() => navigate(`/projects/${project.id}/commitments`)}
        />

        <MetricCard
          title="Unauthorized Scope"
          value={project.unauthorizedCommitments}
          description="Missing change requests"
          icon={AlertTriangle}
          variant={project.unauthorizedCommitments > 0 ? 'danger' : 'default'}
          actionLabel="Review"
          onAction={() => navigate(`/projects/${project.id}/commitments`)}
        />

        <MetricCard
          title="Pending Change Orders"
          value={project.pendingChangeRequests}
          description="Awaiting client sign-off"
          icon={GitPullRequestDraft}
          variant={project.pendingChangeRequests > 0 ? 'warning' : 'default'}
          actionLabel="Review"
          onAction={() => navigate(`/projects/${project.id}/change-requests`)}
        />
      </div>

      {/* Main Grid: Needs Attention & Commitments on Left, Audit Activity on Right */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Needs Attention Alert (Scoped to this project) */}
          <NeedsAttention />

          {/* Commitments Table */}
          <RecentCommitmentsCard commitments={commitments} />
        </div>

        {/* Right 1 Column: Activity Timeline & Details */}
        <div className="space-y-6">
          {/* Audit Timeline */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">
                  Project Audit Timeline
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">Timescale</span>
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
