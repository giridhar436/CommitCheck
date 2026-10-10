import {
  Calendar,
  Users,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Trash2,
  X,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollFadeEffect } from '@/components/scroll-fade-effect'
import { CopyButton } from '@/components/copy-button'
import { formatDate } from '@/lib/utils'
import type { Meeting } from '@/types'

interface MeetingDetailDrawerProps {
  meeting: Meeting | null
  onClose: () => void
  onDelete?: (id: string) => void
  onViewCommitments?: () => void
}

export function MeetingDetailDrawer({
  meeting,
  onClose,
  onDelete,
  onViewCommitments,
}: MeetingDetailDrawerProps) {
  if (!meeting) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-background border-l border-border/80 shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Meeting Intelligence</h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                ID: {meeting.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                onClick={() => onDelete(meeting.id)}
                title="Delete Meeting"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Metadata */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-semibold">
                Analyzed Meeting
              </Badge>
              {meeting.commitmentsDetected > 0 && (
                <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] font-bold">
                  {meeting.commitmentsDetected} Commitment{meeting.commitmentsDetected !== 1 ? 's' : ''} Flagged
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{meeting.title}</h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Date: {formatDate(meeting.date)}
              </span>
              {meeting.analyzedAt && (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Analyzed {new Date(meeting.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Participants */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Participants ({meeting.participants.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {meeting.participants.map((person, idx) => (
                <span
                  key={idx}
                  className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-foreground font-medium"
                >
                  {person}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Executive Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Meeting Summary & Scope Context
            </h4>
            <div className="rounded-xl border border-border/70 bg-card p-4 text-xs leading-relaxed text-foreground shadow-2xs">
              {meeting.summary}
            </div>
          </div>

          {/* Transcript / Evidence */}
          {meeting.transcript && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Verbatim Transcript Evidence
                </h4>
                <CopyButton text={meeting.transcript} size="sm" className="h-7 text-xs px-2 gap-1">
                  Copy Transcript
                </CopyButton>
              </div>
              <ScrollFadeEffect className="max-h-56 rounded-xl border border-border/70 bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {meeting.transcript}
              </ScrollFadeEffect>
            </div>
          )}

          {/* Commitments CTA */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {meeting.commitmentsDetected} Commitment{meeting.commitmentsDetected !== 1 ? 's' : ''} Linked
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Review authorization status & scope creep exposure
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1 text-xs shadow-2xs"
              onClick={onViewCommitments}
            >
              <span>View</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/70 p-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Drawer
          </Button>
        </div>
      </div>
    </div>
  )
}
