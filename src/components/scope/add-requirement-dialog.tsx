import React, { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { scopeService } from '@/services/scope'
import type { Requirement, RequirementPriority, RequirementStatus } from '@/types'

interface AddRequirementDialogProps {
  projectId: string
  requirementToEdit?: Requirement | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved: (req: Requirement) => void
}

export function AddRequirementDialog({
  projectId,
  requirementToEdit,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSaved,
}: AddRequirementDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (newOpen: boolean) => {
    if (isControlled && setControlledOpen) {
      setControlledOpen(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [priority, setPriority] = useState<RequirementPriority>('high')
  const [status, setStatus] = useState<RequirementStatus>('approved')
  const [source, setSource] = useState('SOW Section 3.1')

  useEffect(() => {
    if (requirementToEdit) {
      setName(requirementToEdit.name)
      setDescription(requirementToEdit.description)
      setCategory(requirementToEdit.category)
      setPriority(requirementToEdit.priority)
      setStatus(requirementToEdit.status)
      setSource(requirementToEdit.source)
    } else {
      setName('')
      setDescription('')
      setCategory('General')
      setPriority('high')
      setStatus('approved')
      setSource('SOW Section 3.1')
    }
  }, [requirementToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Requirement name is required.')
      return
    }

    setLoading(true)
    try {
      if (requirementToEdit) {
        const updated = await scopeService.updateRequirement(projectId, requirementToEdit.id, {
          name,
          description,
          category,
          priority,
          status,
          source,
        })
        toast.success(`Requirement "${updated.name}" updated!`)
        onSaved(updated)
      } else {
        const created = await scopeService.addRequirement(projectId, {
          name,
          description,
          category,
          priority,
          status,
          source,
        })
        toast.success(`Requirement "${created.name}" added to approved scope!`)
        onSaved(created)
      }
      setOpen(false)
    } catch {
      toast.error('Failed to save requirement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Requirement
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {requirementToEdit ? 'Edit Scope Requirement' : 'Add Scope Requirement'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define contractual scope boundaries against which verbal commitments are compared.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4">
            <div className="space-y-1">
              <label htmlFor="req-name" className="text-xs font-semibold text-foreground">
                Requirement Name *
              </label>
              <Input
                id="req-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Email & Password Authentication"
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="req-cat" className="text-xs font-semibold text-foreground">
                  Category
                </label>
                <Input
                  id="req-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Authentication"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Priority
                </label>
                <Select
                  value={priority}
                  onValueChange={(val: RequirementPriority) => setPriority(val)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high" className="text-xs">High</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                    <SelectItem value="low" className="text-xs">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Approval Status
                </label>
                <Select
                  value={status}
                  onValueChange={(val: RequirementStatus) => setStatus(val)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="not_in_scope" className="text-xs">Not in Scope</SelectItem>
                    <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label htmlFor="req-src" className="text-xs font-semibold text-foreground">
                  Source Clause *
                </label>
                <Input
                  id="req-src"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. SOW Section 3.1"
                  required
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="req-desc" className="text-xs font-semibold text-foreground">
                Clause Details & Acceptance Criteria
              </label>
              <Textarea
                id="req-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed contractual acceptance criteria from signed SOW..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="text-xs h-8 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : requirementToEdit ? (
                'Save Changes'
              ) : (
                'Add Requirement'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
