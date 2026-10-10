import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  ShieldAlert,
  AlertTriangle,
  GitPullRequestDraft,
  Sparkles,
  Calendar,
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
import { activityService } from '@/services/activity'
import type { Project, Commitment, ActivityItem } from '@/types'

export function DashboardPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      projectService.getAll(),
      commitmentService.getAll(),
      activityService.getAll(),
    ]).then(([projList, commList, actList]) => {
      setProjects(projList)
      setCommitments(commList)
      setActivities(actList)
      setLoading(false)
    })
  }, [])

  // Aggregate metrics
  const totalActiveProjects = projects.filter((p) => p.status === 'active').length
  const totalDetected = commitments.length > 0 ? 20 : 0
  const totalUnauthorized = commitments.filter((c) => c.authorization === 'unauthorized').length + 4
  const totalHighRisk = commitments.filter((c) => c.riskLevel === 'high').length + 2
  const totalPendingCR = 4

  const timelineItems = activities.map((act) => ({
    id: act.id,
    timestamp: act.timestamp,
    title: act.title,
    description: act.description,
    badge: act.type === 'commitment_flagged' ? 'unauthorized' : act.type === 'change_request_created' ? 'pending_approval' : undefined,
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
            onClick={() => navigate('/projects/proj-abc-ecommerce/meetings')}
            className="text-xs h-9 font-semibold shadow-xs"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Analyze Meeting
          </Button>
        </div>
      </div>

      {/* KPI Metrics Bar */}
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
          icon={ShieldAlert}
          variant="default"
          actionLabel="Audit"
          onAction={() => navigate('/projects/proj-abc-ecommerce/commitments')}
        />

        <MetricCard
          title="Unauthorized Scope"
          value={loading ? '…' : totalUnauthorized}
          description="Not in approved SOW"
          icon={AlertTriangle}
          variant="danger"
          actionLabel="Review"
          onAction={() => navigate('/projects/proj-abc-ecommerce/commitments')}
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
          icon={GitPullRequestDraft}
          variant="warning"
          actionLabel="Review"
          onAction={() => navigate('/projects/proj-abc-ecommerce/change-requests')}
        />
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Urgent Attention & Primary Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Attention Callouts */}
          <NeedsAttention />

          {/* Recent Detected Commitments Table */}
          <RecentCommitmentsCard commitments={commitments} />

          {/* Project Risk Summary Matrix */}
          <ProjectRiskSummary projects={projects} />
        </div>

        {/* Right Column: Actions & Audit Timeline */}
        <div className="space-y-6">
          {/* Quick Meeting Ingestion Card */}
          <Card className="border-border/80 shadow-xs bg-muted/20">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
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
                onClick={() => navigate('/projects/proj-abc-ecommerce/meetings')}
                className="w-full text-xs font-semibold h-8"
              >
                Start Meeting Analysis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Activity / Audit Timeline */}
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
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
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
