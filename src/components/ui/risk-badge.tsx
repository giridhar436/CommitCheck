import { cn } from '@/lib/utils'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { RiskLevel } from '@/types'

const riskConfig: Record<RiskLevel, { label: string; icon: typeof AlertTriangle; className: string }> = {
  high: {
    label: 'HIGH',
    icon: AlertTriangle,
    className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-400/20',
  },
  medium: {
    label: 'MEDIUM',
    icon: AlertCircle,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-400/20',
  },
  low: {
    label: 'LOW',
    icon: Info,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/20',
  },
  none: {
    label: 'NONE',
    icon: Info,
    className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 dark:text-zinc-400 dark:border-zinc-400/20',
  },
}

interface RiskBadgeProps {
  level: RiskLevel
  showIcon?: boolean
  className?: string
}

export function RiskBadge({ level, showIcon = true, className }: RiskBadgeProps) {
  const config = riskConfig[level]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold tracking-wide transition-colors',
        config.className,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  )
}
