import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePenLine, ShieldCheck, CircleCheck, CircleX, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { ApiError } from '@/services/api/client'
import { changeRequestService } from '@/services/changeRequests'
import type { Commitment, ChangeRequest } from '@/types'

interface CreateChangeRequestDialogProps {
  commitment: Commitment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (cr: ChangeRequest) => void
}

/**
 * Phase 11 — converts a flagged commitment into a change request.
 * The generation endpoint takes no client input: the backend derives
 * every field from the commitment and its Phase 10 verification, so
 * this dialog only confirms intent and displays the result.
 */
export function CreateChangeRequestDialog({
  commitment,
  open,
  onOpenChange,
  onCreated,
}: CreateChangeRequestDialogProps) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)
  const [created, setCreated] = useState<ChangeRequest | null>(null)

  const handleOpen = (newOpen: boolean) => {
    if (newOpen) {
      setConflict(null)
      setCreated(null)
    }
    onOpenChange(newOpen)
  }

  const handleGenerate = async () => {
    if (!commitment) return
    try {
      setSubmitting(true)
      setConflict(null)
      const cr = await changeRequestService.generate(commitment.projectId, commitment.id)
      setCreated(cr)
      toast.success(`Change Request ${cr.changeRequestId} generated — awaiting approval.`)
      onCreated?.(cr)
    } catch (err) {
      // 409 = generation not allowed (in scope / already authorized /
      // ambiguous / duplicate) — surface the backend's explanation.
      const message =
        err instanceof ApiError ? err.message : 'Failed to generate Change Request'
      setConflict(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!commitment) return null

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-border/80 bg-background/98 p-6 shadow-2xl sm:rounded-2xl">
        {created ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CircleCheck className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Change Request {created.changeRequestId} Generated
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Every field was populated from the commitment and its scope
                    verification — nothing was client-authored.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3">
                <span className="font-mono text-xs font-bold text-foreground">
                  {created.changeRequestId}
                </span>
                <StatusBadge status={created.status} />
              </div>

              <dl className="space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Feature</dt>
                  <dd className="font-medium text-foreground text-right">{created.title}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Source</dt>
                  <dd className="font-medium text-foreground text-right">
                    {created.meetingTitle ?? 'Unrecorded meeting'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Committed By</dt>
                  <dd className="font-medium text-foreground text-right">
                    {created.commitment?.speaker ?? 'Unidentified speaker'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground shrink-0">Promised Deadline</dt>
                  <dd className="font-medium text-foreground text-right">
                    Not specified
                  </dd>
                </div>
              </dl>

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-1">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Why Approval Is Required
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {created.description ?? '—'}
                </p>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                The commitment stays unauthorized until this change request is approved.
              </p>
            </div>

            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpen(false)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="gap-1.5 font-semibold shadow-xs"
                onClick={() => {
                  handleOpen(false)
                  navigate(`/change-requests/${created.id}`)
                }}
              >
                <span>View Change Request</span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FilePenLine className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Generate Change Request
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Formalize this commitment into a change request for client
                    approval.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3">
              {/* Commitment Context Card */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-primary">
                    Flagged Commitment: {commitment.commitmentId}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold"
                  >
                    High Scope Risk
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {commitment.commitment}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Committed by {commitment.committedBy}
                </p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                The change request is generated from the commitment and its scope
                verification: the feature, source meeting, speaker and the reason
                approval is required are all taken from the database — you won't
                be asked to enter them. Creating it does{' '}
                <span className="font-semibold text-foreground">not</span> authorize
                the commitment; that happens only when the change request is
                approved.
              </p>

              {conflict && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <CircleX className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.8} />
                  <span>{conflict}</span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submitting}
                onClick={handleGenerate}
                className="gap-1.5 font-semibold shadow-xs"
              >
                <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>{submitting ? 'Generating…' : 'Generate Change Request'}</span>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
