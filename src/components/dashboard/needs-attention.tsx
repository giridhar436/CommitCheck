import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert,
  ArrowRight,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/risk-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { CopyButton } from '@/components/copy-button'
import { commitmentService } from '@/services/commitments'
import { projectService } from '@/services/projects'
import { formatRelativeTime } from '@/lib/utils'
import type { Commitment, Project } from '@/types'

/** Urgent unauthorized / unreviewed commitments, pulled live from the backend. */
export function NeedsAttention() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Commitment[]>([])
  const [projects, setProjects] = useState<Record<string, Project>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all([commitmentService.getAll(), projectService.getAll()]).then(
      ([commitments, projectList]) => {
        if (cancelled) return
        const attention = commitments
          .filter((c) => c.authorization === 'unauthorized' || c.status === 'needs_review')
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
          .slice(0, 2)
        setItems(attention)
        setProjects(Object.fromEntries(projectList.map((p) => [p.id, p])))
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  if (items.length === 0) return null

  return (
    <Card className="border-red-500/30 bg-red-500/5 shadow-xs">
      <CardHeader className="pb-3 border-b border-red-500/15">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/20 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.8} />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">
              Needs Immediate Attention
            </CardTitle>
          </div>
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
            {items.length} Actionable Risk{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {items.map((comm, idx) => {
          const project = projects[comm.projectId]

          return (
            <div
              key={comm.id}
              className={`rounded-lg border bg-background p-4 shadow-2xs space-y-3 ${
                idx === 0 ? 'border-red-500/25' : 'border-amber-500/25'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RiskBadge level={comm.riskLevel} />
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {comm.commitmentId}
                  </span>
                  <CopyButton text={comm.commitmentId} variant="ghost" size="icon" />
                  {project && (
                    <span className="text-xs text-muted-foreground">
                      • {project.name} ({project.client})
                    </span>
                  )}
                </div>
                <StatusBadge status={comm.status} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {comm.commitment}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Committed by <strong className="text-foreground">{comm.committedBy}</strong>
                  {comm.deadline && (
                    <>
                      {' '}for deadline <strong className="text-foreground">{comm.deadline}</strong>:
                    </>
                  )}
                  {comm.evidence && (
                    <span className="italic block mt-1 text-foreground/90 bg-muted/40 p-2 rounded border border-border/40 font-mono text-[11px]">
                      {comm.evidence}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                  Not found in the approved SOW baseline. No signed change order or budget approval found.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} />
                  <span>Flagged {formatRelativeTime(comm.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {idx === 0 ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/projects/${comm.projectId}/change-requests`)}
                        className="h-8 text-xs font-medium"
                      >
                        Create Change Request
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/commitments/${comm.id}`)}
                        className="h-8 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-red-600"
                      >
                        Review Commitment
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.8} />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/projects/${comm.projectId}/commitments`)}
                      className="h-8 text-xs font-medium"
                    >
                      View in Commitments
                      <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.8} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
