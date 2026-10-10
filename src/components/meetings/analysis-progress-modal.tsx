import {
  Sparkles,
  Search,
  FileCheck2,
  ShieldAlert,
  CircleCheck,
  TriangleAlert,
  ArrowRight,
  CircleX,
  CircleHelp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { MeetingAnalysisState } from '@/types'

interface AnalysisProgressModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: MeetingAnalysisState
  onViewCommitments?: () => void
  onDone?: () => void
}

const steps = [
  {
    key: 'extracting',
    title: 'Extracting commitments',
    desc: 'Parsing statements, deadlines, and speaker promises from transcript',
    icon: Search,
  },
  {
    key: 'checking_scope',
    title: 'Checking approved scope',
    desc: 'Cross-referencing promises against active SOW and requirements',
    icon: FileCheck2,
  },
  {
    key: 'checking_auth',
    title: 'Checking authorization',
    desc: 'Verifying signed change orders, budget addendums, and approvals',
    icon: ShieldAlert,
  },
  {
    key: 'assessing_risk',
    title: 'Assessing scope risk',
    desc: 'Calculating scope creep exposure and generating action recommendations',
    icon: TriangleAlert,
  },
]

export function AnalysisProgressModal({
  open,
  onOpenChange,
  state,
  onViewCommitments,
  onDone,
}: AnalysisProgressModalProps) {
  const isComplete = state.status === 'complete'

  // Count breakdowns
  const commitments = state.commitments || []
  const unauthorizedCount = commitments.filter((c) => c.authorization === 'unauthorized').length
  const needsReviewCount = commitments.filter(
    (c) => c.status === 'needs_review' && c.authorization !== 'unauthorized',
  ).length
  const authorizedCount = commitments.filter((c) => c.authorization === 'authorized').length

  const getStepStatus = (stepKey: string) => {
    if (isComplete) return 'done'
    const stepOrder = ['extracting', 'checking_scope', 'checking_auth', 'assessing_risk']
    const currentIndex = stepOrder.indexOf(state.status)
    const stepIndex = stepOrder.indexOf(stepKey)

    if (stepIndex < currentIndex) return 'done'
    if (stepIndex === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <Dialog open={open} onOpenChange={isComplete ? onOpenChange : undefined}>
      <DialogContent className="max-w-lg overflow-hidden border-border/80 bg-background/95 backdrop-blur-xl p-0 shadow-2xl sm:rounded-2xl">
        {/* Glow Header Accent */}
        <div className="relative h-2 w-full overflow-hidden bg-muted">
          <motion.div
            className="h-full bg-linear-to-r from-blue-600 via-indigo-500 to-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: `${state.progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <div className="p-6">
          <DialogHeader className="mb-5 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4 animate-pulse" strokeWidth={1.8} />
              </span>
              <DialogTitle className="text-lg font-bold">
                {isComplete ? 'Analysis Complete' : 'Analyzing Meeting...'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {isComplete
                ? 'CommitCheck has parsed commitments and matched them with approved scope.'
                : 'Evaluating verbatim statements against verified project baseline specifications.'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="mb-6 space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>{isComplete ? 'Analysis Finished' : 'Processing Pipeline'}</span>
              <span className="font-mono font-semibold text-foreground">{state.progress}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>

          {!isComplete ? (
            /* Step list animation */
            <div className="space-y-3">
              {steps.map((step) => {
                const status = getStepStatus(step.key)
                const Icon = step.icon

                return (
                  <div
                    key={step.key}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-all duration-300 ${
                      status === 'active'
                        ? 'border-primary/40 bg-primary/5 shadow-2xs'
                        : status === 'done'
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-border/40 bg-muted/20 opacity-50'
                    }`}
                  >
                    <div className="mt-0.5">
                      {status === 'done' ? (
                        <CircleCheck className="h-4 w-4 text-emerald-500 animate-fade-in-scale" strokeWidth={1.8} />
                      ) : status === 'active' ? (
                        <div className="relative flex h-4 w-4 items-center justify-center">
                          <span className="absolute h-full w-full animate-ping rounded-full bg-primary/30" />
                          <Icon className="h-4 w-4 text-primary animate-pulse" strokeWidth={1.8} />
                        </div>
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold ${
                          status === 'active'
                            ? 'text-foreground'
                            : status === 'done'
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Analysis Complete Summary Card */
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                {/* Result Hero Banner */}
                <div className="rounded-xl border border-border/80 bg-linear-to-b from-muted/40 to-muted/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Detection Summary</p>
                      <h4 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                        {commitments.length} Commitment{commitments.length !== 1 ? 's' : ''} Identified
                      </h4>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs py-1 px-2.5">
                      Verified
                    </Badge>
                  </div>

                  {/* 3 Metric Pills per PRD */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 text-center">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                        <CircleX className="h-3 w-3" strokeWidth={1.8} /> Unauthorized
                      </span>
                      <span className="mt-1 text-lg font-black text-red-600 dark:text-red-400">
                        {unauthorizedCount}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 text-center">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <CircleHelp className="h-3 w-3" strokeWidth={1.8} /> Review Needed
                      </span>
                      <span className="mt-1 text-lg font-black text-amber-600 dark:text-amber-400">
                        {needsReviewCount}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-center">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CircleCheck className="h-3 w-3" strokeWidth={1.8} /> Authorized
                      </span>
                      <span className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {authorizedCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detected Items Preview */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Immediate Scope Flags
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {commitments.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-2.5 text-xs shadow-2xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-foreground truncate">{c.commitment}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Promised by {c.committedBy} &bull; {c.deadline || 'No deadline specified'}
                          </p>
                        </div>
                        {c.riskLevel === 'high' ? (
                          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] shrink-0 font-bold">
                            High Risk
                          </Badge>
                        ) : c.riskLevel === 'medium' ? (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] shrink-0">
                            Medium Risk
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                            Authorized
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={onDone}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 shadow-sm"
                    onClick={onViewCommitments}
                  >
                    <span>Inspect Commitments</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
