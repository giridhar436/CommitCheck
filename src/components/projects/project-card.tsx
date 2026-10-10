import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  FileCheck,
  ShieldAlert,
  GitPullRequestDraft,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskBadge } from '@/components/ui/risk-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/types'

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate()

  return (
    <Card className="group relative overflow-hidden border-border/80 shadow-xs hover:border-border transition-all duration-200">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                onClick={() => navigate(`/projects/${project.id}`)}
                className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
              >
                {project.name}
              </h3>
              <StatusBadge status={project.status} />
              <RiskBadge level={project.riskLevel} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Client: <strong className="text-foreground">{project.client}</strong>
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Started {formatDate(project.startDate)}</span>
          </div>
        </div>

        {/* Project Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {project.description || 'No detailed project description specified.'}
        </p>

        {/* Metric Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground uppercase font-medium">
              <FileCheck className="h-3 w-3 text-emerald-500" />
              <span>Approved Scope</span>
            </div>
            <div className="mt-1 font-mono text-base font-bold text-foreground">
              {project.approvedRequirements}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground uppercase font-medium">
              <ShieldAlert className="h-3 w-3 text-primary" />
              <span>Commitments</span>
            </div>
            <div className="mt-1 font-mono text-base font-bold text-foreground">
              {project.detectedCommitments}
            </div>
          </div>

          <div
            className={`rounded-lg border p-2.5 text-center ${
              project.unauthorizedCommitments > 0
                ? 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400'
                : 'border-border/60 bg-muted/20 text-muted-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-medium">
              <span>Unauthorized</span>
            </div>
            <div className="mt-1 font-mono text-base font-bold">
              {project.unauthorizedCommitments}
            </div>
          </div>

          <div
            className={`rounded-lg border p-2.5 text-center ${
              project.pendingChangeRequests > 0
                ? 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400'
                : 'border-border/60 bg-muted/20 text-muted-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-medium">
              <GitPullRequestDraft className="h-3 w-3" />
              <span>Pending CRs</span>
            </div>
            <div className="mt-1 font-mono text-base font-bold">
              {project.pendingChangeRequests}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}/meetings`)}
              className="h-8 text-xs font-medium"
            >
              <Sparkles className="mr-1.5 h-3 w-3 text-primary" />
              Analyze Meeting
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}/scope`)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Scope ({project.approvedRequirements})
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => navigate(`/projects/${project.id}`)}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            Open Project
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
