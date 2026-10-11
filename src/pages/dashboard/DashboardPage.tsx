import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  ClipboardCheck,
  ShieldAlert,
  CircleX,
  FilePenLine,
  Sparkles,
  Video,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { NeedsAttention } from '@/components/dashboard/needs-attention'
import { ProjectRiskSummary } from '@/components/dashboard/project-risk-summary'
import { RecentCommitmentsCard } from '@/components/dashboard/recent-commitments-card'
import { ActivityTimeline } from '@/components/activity/activity-timeline'
import { projectService } from '@/services/projects'
import { commitmentService } from '@/services/commitments'
import { dashboardService } from '@/services/dashboard'
import { formatActivityAction } from '@/lib/utils'
import type { Project, Commitment, DashboardData } from '@/types'

export function DashboardPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  /** One Phase 12 dashboard aggregate per project (real counts, attention items). */
  const [dashboards, setDashboards] = useState<DashboardData[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      projectService.getAll(),
      commitmentService.getAll(),
    ]).then(async ([projList, commList]) => {
      setProjects(projList)
      setCommitments(commList)
      // Per-project aggregates (each is a single request; nothing here
      // calls the AI provider — every number is database-derived).
      const dashes = await Promise.all(
        projList.map((p) => dashboardService.getOverview(p.id).catch(() => null)),
      )
      setDashboards(dashes.filter((d): d is DashboardData => d !== null))
      setLoading(false)
    })
  }, [])

  // Aggregate metrics (first project hosts the quick-action deep links)
  const firstProjectId = projects[0]?.id
  const totalActiveProjects = projects.filter((p) => p.status === 'active').length
  const totalDetected = dashboards.reduce((sum, d) => sum + d.summary.commitments, 0)
  const totalUnauthorized = dashboards.reduce(
    (sum, d) => sum + d.summary.unauthorizedCommitments,
    0,
  )
  const totalHighRisk = dashboards.reduce((sum, d) => sum + d.summary.highRiskCommitments, 0)
  const totalPendingCR = dashboards.reduce(
    (sum, d) => sum + d.summary.pendingChangeRequests,
    0,
  )

  // Attention items merged across projects — highest severity first, then newest.
  const attentionItems = useMemo(() => {
    const projectName = new Map(projects.map((p) => [p.id, p.name]))
    return dashboards
      .flatMap((d) =>
        d.attentionItems.map((item) => ({
          ...item,
          projectId: d.project.id,
          projectName: projectName.get(d.project.id),
        })),
      )
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1
        return a.createdAt < b.createdAt ? 1 : -1
      })
      .slice(0, 5)
  }, [dashboards, projects])

  // Cross-project audit trail — the newest entries from each project.
  const recentActivity = useMemo(() => {
    return dashboards
      .flatMap((d) => d.recentActivity)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 8)
  }, [dashboards])

  // Risk matrix fed from each project's real authorization breakdown.
  const riskProjects = useMemo(
    () =>
      projects.map((p) => {
        const dash = dashboards.find((d) => d.project.id === p.id)
        if (!dash) return p
        return {
          ...p,
          unauthorizedCommitments: dash.summary.unauthorizedCommitments,
          riskLevel:
            dash.summary.unauthorizedCommitments > 0
              ? ('high' as const)
              : dash.summary.commitments > 0
                ? ('medium' as const)
                : ('low' as const),
        }
      }),
    [projects, dashboards],
  )

  const timelineItems = recentActivity.map((act) => ({
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Project Risk & Attention Dashboard
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm leading-relaxed">
            What needs your attention? Review verbal promises, unauthorized scope creep, and pending client approvals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/projects')}
            className="text-xs h-9"
          >
            All Projects
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(firstProjectId ? `/projects/${firstProjectId}/meetings` : '/projects')}
            className="text-xs h-9 font-semibold shadow-xs"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.8} />
            Analyze Meeting
          </Button>
        </div>
      </div>

      {/* KPI Metrics Bar — live aggregates from each project's dashboard */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Active Projects"
          value={loading ? '…' : totalActiveProjects}
          description="Managed client accounts"
          icon={FolderKanban}
          variant="default"
          actionLabel="View"
          onAction={() => navigate('/projects')}
        />

        <MetricCard
          title="Detected Commitments"
          value={loading ? '…' : totalDetected}
          description="From analyzed calls & notes"
          icon={ClipboardCheck}
          variant="default"
          actionLabel="Audit"
          onAction={() => navigate(firstProjectId ? `/projects/${firstProjectId}/commitments` : '/projects')}
        />

        <MetricCard
          title="Unauthorized Scope"
          value={loading ? '…' : totalUnauthorized}
          description="Not in approved SOW"
          icon={CircleX}
          variant="danger"
          actionLabel="Review"
          onAction={() => navigate(firstProjectId ? `/projects/${firstProjectId}/commitments` : '/projects')}
        />

        <MetricCard
          title="High Risk Commitments"
          value={loading ? '…' : totalHighRisk}
          description="Critical scope creep"
          icon={ShieldAlert}
          variant="danger"
        />

        <MetricCard
          title="Pending Change Orders"
          value={loading ? '…' : totalPendingCR}
          description="Awaiting client sign-off"
          icon={FilePenLine}
          variant="warning"
          actionLabel="Review"
          onAction={() => navigate(firstProjectId ? `/projects/${firstProjectId}/change-requests` : '/projects')}
        />
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Urgent Attention & Primary Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Attention Callouts — backend attention items */}
          <NeedsAttention items={attentionItems} />

          {/* Recent Detected Commitments Table */}
          <RecentCommitmentsCard commitments={commitments} />

          {/* Project Risk Summary Matrix */}
          <ProjectRiskSummary projects={riskProjects} />
        </div>

        {/* Right Column: Actions & Audit Timeline */}
        <div className="space-y-6">
          {/* Quick Meeting Ingestion Card */}
          <Card className="border-border/80 shadow-xs bg-muted/20">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" strokeWidth={1.8} />
                <CardTitle className="text-sm font-bold text-foreground">
                  Analyze Client Meeting
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Finished a call with <strong className="text-foreground">Acme Corp</strong>? Paste the summary notes to automatically detect new promises.
              </p>
              <div className="rounded-md border border-border/60 bg-background/60 p-2.5 text-[11px] font-mono text-muted-foreground">
                "Can we also add Google Login by Friday?"
              </div>
              <Button
                size="sm"
                onClick={() => navigate(firstProjectId ? `/projects/${firstProjectId}/meetings` : '/projects')}
                className="w-full text-xs font-semibold h-8"
              >
                Start Meeting Analysis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.8} />
              </Button>
            </CardContent>
          </Card>

          {/* Activity / Audit Timeline — real backend activity */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">
                  Audit Activity Timeline
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">Real-time trace</span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <ActivityTimeline items={timelineItems} />
            </CardContent>
          </Card>

          {/* Scope Protection Rule Card */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" strokeWidth={1.8} />
                <CardTitle className="text-xs font-bold text-foreground">
                  Verification Philosophy
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="leading-relaxed">
                CommitCheck operates as an explicit authorization gate between what is said in meetings and what is implemented in code.
              </p>
              <div className="rounded bg-muted/40 p-2 text-[11px] font-medium text-foreground">
                "Make sure what was promised to the client is actually approved before it becomes work."
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
