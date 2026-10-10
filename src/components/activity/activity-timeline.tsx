import {
  TimescaleRoot,
  TimescaleTrack,
  TimescaleRail,
  TimescaleItem,
  TimescaleTick,
  TimescaleAge,
  TimescaleContent,
} from '@/components/timescale'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatTime } from '@/lib/utils'

export interface TimelineEntry {
  id: string
  timestamp: string | Date
  title: string
  description: string
  badge?: string
}

export function ActivityTimeline({
  items,
  className,
}: {
  items: TimelineEntry[]
  className?: string
}) {
  return (
    <TimescaleRoot orientation="vertical" className={className}>
      <TimescaleRail />
      <TimescaleTrack>
        {items.map((item) => (
          <TimescaleItem key={item.id}>
            <TimescaleTick />
            <TimescaleAge>{typeof item.timestamp === 'string' && item.timestamp.includes(':') && !item.timestamp.includes('T') ? item.timestamp : formatTime(item.timestamp)}</TimescaleAge>
            <TimescaleContent className="pt-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {item.title}
                </span>
                {item.badge && <StatusBadge status={item.badge} />}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </TimescaleContent>
          </TimescaleItem>
        ))}
      </TimescaleTrack>
    </TimescaleRoot>
  )
}
