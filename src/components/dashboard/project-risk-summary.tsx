import { useNavigate } from 'react-router-dom'
import { FolderKanban, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/risk-badge'
import type { Project } from '@/types'

export function ProjectRiskSummary({ projects }: { projects: Project[] }) {
  const navigate = useNavigate()

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-bold text-foreground">
            Project Risk Matrix
          </CardTitle>
        </div>
        <button
          onClick={() => navigate('/projects')}
          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          View all ({projects.length}) →
        </button>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-border/60">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => navigate(`/projects/${project.id}`)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground truncate">
                  {project.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({project.client})
                </span>
                <RiskBadge level={project.riskLevel} />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {project.description}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span title="Approved Requirements">
                  <strong className="text-foreground">{project.approvedRequirements}</strong> approved
                </span>
                <span>•</span>
                <span
                  title="Unauthorized Commitments"
                  className={project.unauthorizedCommitments > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}
                >
                  <strong className="text-foreground">{project.unauthorizedCommitments}</strong> unauthorized
                </span>
                <span>•</span>
                <span title="Pending Change Requests">
                  <strong className="text-foreground">{project.pendingChangeRequests}</strong> CRs
                </span>
              </div>

              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
