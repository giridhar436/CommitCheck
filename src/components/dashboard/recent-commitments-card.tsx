import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/risk-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import type { Commitment } from '@/types'

export function RecentCommitmentsCard({ commitments }: { commitments: Commitment[] }) {
  const navigate = useNavigate()

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" strokeWidth={1.8} />
          <CardTitle className="text-sm font-bold text-foreground">
            Recent Detected Commitments
          </CardTitle>
        </div>
        <button
          onClick={() => navigate('/commitments')}
          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          View all commitments →
        </button>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-border/60">
        {commitments.slice(0, 5).map((comm) => (
          <div
            key={comm.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/40 transition-colors"
          >
            <div className="min-w-0 space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {comm.commitmentId}
                </span>
                <CopyButton text={comm.commitmentId} variant="ghost" size="icon" />
                <RiskBadge level={comm.riskLevel} />
                <StatusBadge status={comm.status} />
              </div>

              <h4 className="text-xs font-semibold text-foreground leading-snug">
                {comm.commitment}
              </h4>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                <span>By: <strong className="text-foreground">{comm.committedBy}</strong></span>
                <span>•</span>
                <span>Deadline: <strong className="text-foreground">{comm.deadline ?? 'Not specified'}</strong></span>
                <span>•</span>
                <span className={comm.scopeMatch === 'not_found' ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                  {comm.scopeMatch === 'not_found' ? 'Scope: Not in Approved SOW' : 'Scope: Matches Approved Clause'}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/commitments/${comm.id}`)}
                className="h-8 text-xs font-medium"
              >
                Review
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
