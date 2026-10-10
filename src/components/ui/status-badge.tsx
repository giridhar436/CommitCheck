import { cn } from '@/lib/utils'
import type { CommitmentStatus, ChangeRequestStatus, AuthorizationStatus } from '@/types'

type StatusType = CommitmentStatus | ChangeRequestStatus | AuthorizationStatus | string

const statusConfig: Record<string, { label: string; className: string }> = {
  // Commitment statuses
  needs_review: {
    label: 'Needs Review',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-400/20',
  },
  authorized: {
    label: 'Authorized',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/20',
  },
  unauthorized: {
    label: 'Unauthorized',
    className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-400/20',
  },
  dismissed: {
    label: 'Dismissed',
    className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 dark:text-zinc-400 dark:border-zinc-400/20',
  },
  change_request_created: {
    label: 'Change Request',
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400 dark:border-violet-400/20',
  },

  // Change request statuses
  draft: {
    label: 'Draft',
    className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 dark:text-zinc-400 dark:border-zinc-400/20',
  },
  pending_approval: {
    label: 'Pending Approval',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-400/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-400/20',
  },
  implemented: {
    label: 'Implemented',
    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400 dark:border-purple-400/20',
  },

  // Authorization
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-400/20',
  },
  not_found: {
    label: 'Not Found',
    className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-400/20',
  },
}

interface StatusBadgeProps {
  status: StatusType
  className?: string
  showDot?: boolean
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
        config.className,
        className,
      )}
    >
      {showDot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {config.label}
    </span>
  )
}
