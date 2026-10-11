import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowRight, Clock, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
import type { AlertItem } from '@/types'

/** Attention item enriched with project context by the caller (dashboard or
 *  project overview — both feed from the Phase 12 dashboard/alerts data). */
export type AttentionEntry = AlertItem & { projectId: string; projectName?: string }

/**
 * Prominent attention section driven by the backend's deterministic
 * attention items (high-risk unauthorized commitments, ambiguous
 * verifications, open change requests). Pure presentation — the caller
 * supplies the data, so nothing here is recomputed client-side.
 */
export function NeedsAttention({ items }: { items: AttentionEntry[] }) {
  const navigate = useNavigate()

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
        {items.map((item, idx) => {
          const isCommitment = Boolean(item.commitmentId)

          return (
            <div
              key={item.id}
              className={`rounded-lg border bg-background p-4 shadow-2xs space-y-3 ${
                item.severity === 'HIGH' ? 'border-red-500/25' : 'border-amber-500/25'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      item.severity === 'HIGH'
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {item.severity} Priority
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {item.type === 'UNAUTHORIZED_COMMITMENT'
                      ? 'Unauthorized Scope Creep'
                      : item.type === 'AMBIGUOUS_VERIFICATION'
                        ? 'Ambiguous Verification'
                        : item.type === 'PENDING_CHANGE_REQUEST'
                          ? 'Change Request Pending'
                          : 'Clarification Requested'}
                  </span>
                  {item.projectName && (
                    <span className="text-xs text-muted-foreground">• {item.projectName}</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} />
                  <span>Updated {formatRelativeTime(item.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {idx === 0 ? (
                    <>
                      {isCommitment && item.type === 'UNAUTHORIZED_COMMITMENT' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/projects/${item.projectId}/change-requests`)}
                          className="h-8 text-xs font-medium"
                        >
                          Create Change Request
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() =>
                          isCommitment
                            ? navigate(`/commitments/${item.commitmentId}`)
                            : navigate(`/change-requests/${item.changeRequestId}`)
                        }
                        className={`h-8 text-xs font-semibold text-white ${
                          item.severity === 'HIGH'
                            ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600'
                            : ''
                        }`}
                      >
                        {isCommitment ? 'Review Commitment' : 'Review Change Request'}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.8} />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        isCommitment
                          ? navigate(`/commitments/${item.commitmentId}`)
                          : navigate(`/change-requests/${item.changeRequestId}`)
                      }
                      className="h-8 text-xs font-medium"
                    >
                      Inspect
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
