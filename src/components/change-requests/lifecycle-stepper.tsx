import {
  Video,
  ClipboardCheck,
  TriangleAlert,
  FilePenLine,
  CircleCheck,
  CircleX,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChangeRequestStatus } from '@/types'

interface LifecycleStepperProps {
  status: ChangeRequestStatus
  className?: string
}

export function LifecycleStepper({ status, className }: LifecycleStepperProps) {
  const steps = [
    {
      key: 'meeting',
      label: 'Client Meeting',
      sublabel: 'Dialogue ingested',
      icon: Video,
      state: 'complete',
    },
    {
      key: 'commitment',
      label: 'Commitment',
      sublabel: 'Promise detected',
      icon: ClipboardCheck,
      state: 'complete',
    },
    {
      key: 'scope_mismatch',
      label: 'Scope Mismatch',
      sublabel: 'Creep flagged',
      icon: TriangleAlert,
      state: 'complete',
    },
    {
      key: 'change_request',
      label: 'Change Request',
      sublabel: 'Proposal drafted',
      icon: FilePenLine,
      state: 'complete',
    },
    {
      key: 'approval',
      label:
        status === 'approved'
          ? 'Approved'
          : status === 'rejected'
            ? 'Rejected'
            : status === 'implemented'
              ? 'Implemented'
              : 'Client Approval',
      sublabel:
        status === 'approved'
          ? 'Signed & baseline updated'
          : status === 'rejected'
            ? 'Deflected to Phase 2'
            : status === 'implemented'
              ? 'Work completed'
              : 'Awaiting client sign-off',
      icon:
        status === 'approved' || status === 'implemented'
          ? CircleCheck
          : status === 'rejected'
            ? CircleX
            : Clock,
      state:
        status === 'approved' || status === 'implemented'
          ? 'approved'
          : status === 'rejected'
            ? 'rejected'
            : 'pending',
    },
  ]

  return (
    <div className={cn('rounded-xl border border-border/80 bg-card p-4 shadow-2xs', className)}>
      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">
        CommitCheck Verification Pipeline
      </p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
        {/* Horizontal connector line on desktop */}
        <div className="hidden sm:block absolute top-4.5 left-6 right-6 h-0.5 bg-border -z-0" />

        {steps.map((step, idx) => {
          const Icon = step.icon
          const isPending = step.state === 'pending'
          const isApproved = step.state === 'approved'
          const isRejected = step.state === 'rejected'

          return (
            <div
              key={step.key}
              className="relative z-10 flex sm:flex-col items-center gap-3 sm:gap-1.5 text-left sm:text-center w-full sm:w-auto"
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300 shadow-2xs',
                  isApproved
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : isRejected
                      ? 'border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-400'
                      : isPending
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                        : 'border-primary/30 bg-primary/10 text-primary',
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </div>

              <div>
                <p
                  className={cn(
                    'text-xs font-bold leading-tight',
                    isApproved
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isRejected
                        ? 'text-red-600 dark:text-red-400'
                        : isPending
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-foreground',
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{step.sublabel}</p>
              </div>

              {/* Vertical connector on mobile between steps */}
              {idx < steps.length - 1 && (
                <div className="sm:hidden ml-4 h-3 w-0.5 bg-border my-0.5" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
