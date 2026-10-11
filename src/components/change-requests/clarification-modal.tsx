import { useState } from 'react'
import { CircleHelp, Send } from 'lucide-react'
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

interface ClarificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (notes: string) => Promise<void> | void
}

export function ClarificationModal({
  open,
  onOpenChange,
  onConfirm,
}: ClarificationModalProps) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSend = async () => {
    try {
      setSubmitting(true)
      await onConfirm(notes)
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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CircleHelp className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">Request Clarification</DialogTitle>
              <DialogDescription className="text-xs">
                Send technical or scope questions to the client before finalizing this change request.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Questions & Scope Clarifications
            </label>
            <Textarea
              placeholder="State what needs clarification from client stakeholders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="text-xs leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={submitting || !notes.trim()}
            onClick={handleSend}
            className="gap-1.5 font-semibold"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.8} />
            {submitting ? 'Sending...' : 'Send Clarification Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
