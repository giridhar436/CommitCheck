import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  title: string
  value: number | string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'danger' | 'warning' | 'success'
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'default',
  actionLabel,
  onAction,
  className,
}: MetricCardProps) {
  const variantStyles = {
    default: {
      border: 'border-border/80',
      badge: 'bg-primary/10 text-primary',
      valueText: 'text-foreground',
    },
    danger: {
      border: 'border-red-500/30 bg-red-500/5',
      badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
      valueText: 'text-red-600 dark:text-red-400',
    },
    warning: {
      border: 'border-amber-500/30 bg-amber-500/5',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      valueText: 'text-amber-600 dark:text-amber-400',
    },
    success: {
      border: 'border-emerald-500/30 bg-emerald-500/5',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueText: 'text-emerald-600 dark:text-emerald-400',
    },
  }

  const styles = variantStyles[variant]

  return (
    <Card className={cn('relative overflow-hidden shadow-xs transition-colors', styles.border, className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground truncate uppercase tracking-wider">
            {title}
          </span>
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', styles.badge)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <div className={cn('text-2xl font-bold tracking-tight font-mono sm:text-3xl', styles.valueText)}>
            {value}
          </div>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              {actionLabel} →
            </button>
          )}
        </div>

        {description && (
          <p className="mt-1 text-[11px] text-muted-foreground leading-normal truncate">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
