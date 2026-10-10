import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  ShieldAlert,
  FilePenLine,
  Info,
  ArrowRight,
  CircleCheck,
  CircleX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { notificationService } from '@/services/notifications'
import type { Notification } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

export function NotificationsPopover() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'high_risk'>('all')

  const loadNotifications = () => {
    notificationService.getAll().then(setNotifications)
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead()
    loadNotifications()
  }

  const handleItemAction = async (notif: Notification, e: React.MouseEvent) => {
    e.stopPropagation()
    await notificationService.markRead(notif.id)
    loadNotifications()

    if (notif.relatedType === 'commitment') {
      navigate(`/commitments/${notif.relatedId || 'comm-google-login'}`)
    } else if (notif.relatedType === 'change_request') {
      navigate(`/change-requests/${notif.relatedId || 'cr-google-login'}`)
    } else {
      navigate('/dashboard')
    }
  }

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read)
    if (filter === 'high_risk')
      return notifications.filter((n) => n.type === 'high_risk' || n.type === 'unauthorized')
    return notifications
  }, [notifications, filter])

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'high_risk':
      case 'unauthorized':
        return <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" strokeWidth={1.8} />
      case 'approval_needed':
        return <FilePenLine className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.8} />
      case 'approved':
        return <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={1.8} />
      case 'rejected':
        return <CircleX className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" strokeWidth={1.8} />
      default:
        return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.8} />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-84 sm:w-96 p-0 shadow-xl border-border/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <CheckCheck className="h-3 w-3" strokeWidth={1.8} />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 bg-background text-[11px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              filter === 'all'
                ? 'bg-muted text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-muted text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('high_risk')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              filter === 'high_risk'
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold'
                : 'text-red-600/80 dark:text-red-400/80 hover:text-red-600'
            }`}
          >
            High Risk
          </button>
        </div>

        {/* Notifications List */}
        <div className="max-h-88 overflow-y-auto divide-y divide-border/40">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No notifications in this view.
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isHighRisk = notif.type === 'high_risk' || notif.type === 'unauthorized'

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 transition-colors ${
                    !notif.read ? 'bg-primary/5' : 'opacity-85 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {getIcon(notif.type)}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold leading-tight truncate ${
                          isHighRisk ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                        }`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                        {notif.message}
                      </p>

                      {/* Interactive Action CTA (PRD §24 mandate: "Notifications should lead to actions") */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {notif.relatedType === 'commitment' ? 'Scope Creep' : notif.relatedType === 'change_request' ? 'Scope Order' : 'Meeting'}
                        </span>
                        <Button
                          size="sm"
                          className="h-6 text-[11px] px-2.5 gap-1 font-semibold shadow-2xs"
                          variant={isHighRisk ? 'default' : 'outline'}
                          onClick={(e) => handleItemAction(notif, e)}
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="p-2 text-center bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground h-7"
          >
            Go to Attention Center
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
