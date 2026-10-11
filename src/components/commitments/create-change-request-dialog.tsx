import { useState } from 'react'
import {
  FilePenLine,
  Clock,
  DollarSign,
  TriangleAlert,
  User,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { changeRequestService } from '@/services/changeRequests'
import type { Commitment, ChangeRequest } from '@/types'

interface CreateChangeRequestDialogProps {
  commitment: Commitment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (cr: ChangeRequest) => void
}

export function CreateChangeRequestDialog({
  commitment,
  open,
  onOpenChange,
  onCreated,
}: CreateChangeRequestDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState(
    commitment ? `Scope Change: ${commitment.commitment}` : '',
  )
  const [feature, setFeature] = useState(
    commitment?.commitment || 'Google OAuth Single Sign-On Integration',
  )
  const [originalScope, setOriginalScope] = useState(
    commitment?.matchedRequirement || 'SOW Section 3.1: Email & Password authentication only',
  )
  const [committedBy, setCommittedBy] = useState(
    commitment?.committedBy || 'Rahul Mehta (Tech Lead)',
  )
  const [promisedDeadline, setPromisedDeadline] = useState(
    commitment?.deadline || 'Friday, March 14',
  )
  const [estimatedEffort, setEstimatedEffort] = useState('18 hours ($2,250 @ $125/hr)')
  const [impact, setImpact] = useState(
    'Requires Google Cloud Console OAuth 2.0 app setup, backend token callback handler, session encryption update, and UI provider buttons.',
  )

  // Update defaults if commitment changes
  const handleOpen = (newOpen: boolean) => {
    if (newOpen && commitment) {
      setTitle(`Scope Change: ${commitment.commitment}`)
      setFeature(commitment.commitment)
      setOriginalScope(
        commitment.matchedRequirement || 'SOW Section 3.1: Email & Password authentication only',
      )
      setCommittedBy(commitment.committedBy)
      setPromisedDeadline(commitment.deadline || 'Friday')
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commitment) return
    if (!title.trim() || !feature.trim()) {
      toast.error('Please enter a title and feature description')
      return
    }

    try {
      setSubmitting(true)
      const newCr = await changeRequestService.create({
        projectId: commitment.projectId,
        commitmentId: commitment.id,
        title,
        feature,
        source: `Client Meeting — ${commitment.deadline || 'Recent'}`,
        committedBy,
        promisedDeadline,
        originalScope,
        estimatedEffort,
        impact,
        status: 'pending_approval',
      })

      toast.success(`Change Request ${newCr.changeRequestId} created successfully!`)
      onOpenChange(false)
      onCreated?.(newCr)
    } catch {
      toast.error('Failed to create Change Request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!commitment) return null

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-border/80 bg-background/98 p-6 shadow-2xl sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FilePenLine className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">
                Generate Structured Change Request
              </DialogTitle>
              <DialogDescription className="text-xs">
                Formalize this commitment into an approved change order before implementation begins.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Commitment Context Card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-primary">
              Flagged Commitment: {commitment.commitmentId}
            </span>
            <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold">
              High Scope Risk
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground">
            {commitment.commitment}
          </p>
          <p className="text-[11px] text-muted-foreground italic">
            Evidence: {commitment.evidence}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Change Request Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Change Request Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scope Change: Add Google OAuth Login"
              className="text-xs"
              required
            />
          </div>

          {/* Feature & Original Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Requested Feature
              </label>
              <Input
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Original Approved Scope Baseline
              </label>
              <Input
                value={originalScope}
                onChange={(e) => setOriginalScope(e.target.value)}
                className="text-xs font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Committed By & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground" strokeWidth={1.8} />
                Committed By
              </label>
              <Input
                value={committedBy}
                onChange={(e) => setCommittedBy(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" strokeWidth={1.8} />
                Promised Deadline
              </label>
              <Input
                value={promisedDeadline}
                onChange={(e) => setPromisedDeadline(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Estimated Effort & Budget */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" strokeWidth={1.8} />
              Estimated Effort & Budget Impact
            </label>
            <Input
              value={estimatedEffort}
              onChange={(e) => setEstimatedEffort(e.target.value)}
              placeholder="e.g. 18 hours ($2,250 @ $125/hr)"
              className="text-xs"
            />
          </div>

          {/* Technical & Timeline Impact */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <TriangleAlert className="h-3 w-3 text-muted-foreground" strokeWidth={1.8} />
              Impact on Architecture & Delivery
            </label>
            <Textarea
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              rows={3}
              className="text-xs leading-relaxed"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5 font-semibold shadow-xs"
            >
              <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span>{submitting ? 'Creating...' : 'Submit for Client Approval'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
