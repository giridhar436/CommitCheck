import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
  action?: React.ReactNode
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section. Please try again.',
  onRetry,
  className,
  action,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center text-foreground',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">{message}</p>
      {action ? (
        <div className="mt-5">{action}</div>
      ) : onRetry ? (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-5 inline-flex items-center gap-1.5 text-xs border-destructive/30 hover:bg-destructive/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try Again
        </Button>
      ) : null}
    </div>
  )
}
