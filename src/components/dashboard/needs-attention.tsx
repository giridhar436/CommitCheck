import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/risk-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { CopyButton } from '@/components/copy-button'

export function NeedsAttention() {
  const navigate = useNavigate()

  return (
    <Card className="border-red-500/30 bg-red-500/5 shadow-xs">
      <CardHeader className="pb-3 border-b border-red-500/15">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/20 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">
              Needs Immediate Attention
            </CardTitle>
          </div>
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
            2 Actionable Risks
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Urgent Item 1: Google Login (Primary PRD Example) */}
        <div className="rounded-lg border border-red-500/25 bg-background p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RiskBadge level="high" />
              <span className="font-mono text-xs font-semibold text-foreground">
                CC-8F42A1
              </span>
              <CopyButton text="CC-8F42A1" variant="ghost" size="icon" />
              <span className="text-xs text-muted-foreground">• ABC E-Commerce (Acme Corp)</span>
            </div>
            <StatusBadge status="needs_review" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">
              Google Login was promised to the client but is NOT in approved scope
            </h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Committed by <strong className="text-foreground">Rahul Mehta</strong> for deadline <strong className="text-foreground">Friday, March 14</strong>:
              <span className="italic block mt-1 text-foreground/90 bg-muted/40 p-2 rounded border border-border/40 font-mono text-[11px]">
                "Sure, I'll add Google Login by Friday."
              </span>
            </p>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
              SOW Section 3.1 covers Email/Password authentication only. No signed change order or budget approval found.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Flagged 10:33 AM today</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/projects/proj-abc-ecommerce/change-requests')}
                className="h-8 text-xs font-medium"
              >
                Create Change Request
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/commitments/comm-google-login')}
                className="h-8 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-red-600"
              >
                Review Commitment
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Urgent Item 2: Multi-Currency Pricing */}
        <div className="rounded-lg border border-amber-500/25 bg-background p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RiskBadge level="high" />
              <span className="font-mono text-xs font-semibold text-foreground">
                CC-1B74E9
              </span>
              <CopyButton text="CC-1B74E9" variant="ghost" size="icon" />
              <span className="text-xs text-muted-foreground">• ABC E-Commerce (Acme Corp)</span>
            </div>
            <StatusBadge status="needs_review" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">
              EUR & GBP Multi-Currency pricing promised without FX scope addendum
            </h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Developer mentioned dynamic currency switching for Sprint 3 close, but SOW Section 3.4 explicitly designates USD as the sole transacting currency.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
            <span className="text-[11px] text-muted-foreground">Sprint 3 Check-in Meeting</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/projects/proj-abc-ecommerce/commitments')}
                className="h-8 text-xs font-medium"
              >
                View in Commitments
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
