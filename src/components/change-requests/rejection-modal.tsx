import { useState } from 'react'
import { CircleX, TriangleAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RejectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void> | void
}

const COMMON_REASONS = [
  'Scope postponed to Phase 2 roadmap',
  'Client declined additional engineering budget',
  'Feature alternative solution chosen within approved scope',
  'Timeline constraints prevent delivery before launch',
]

export function RejectionModal({ open, onOpenChange, onConfirm }: RejectionModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(COMMON_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleReject = async () => {
    try {
      setSubmitting(true)
      const finalReason = customReason.trim() ? customReason.trim() : selectedPreset
      await onConfirm(finalReason)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-border/80 bg-background/98 p-6 shadow-2xl sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <CircleX className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">Reject Change Request</DialogTitle>
              <DialogDescription className="text-xs">
                Mark this requested scope change as rejected and record the contractual rationale.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Select Primary Reason
            </label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason} className="text-xs">
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Additional Explanation (Optional)</span>
            </label>
            <Textarea
              placeholder="Provide specific notes or client feedback..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              className="text-xs leading-relaxed"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-[11px] text-red-700 dark:text-red-300">
            <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={1.8} />
            <span>
              Rejecting this change request will prevent this work from becoming engineering tasks and keeps the project within the signed contract baseline.
            </span>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={submitting}
            onClick={handleReject}
          >
            {submitting ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
