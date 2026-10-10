import React, { useState } from 'react'
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
import { projectService } from '@/services/projects'
import type { Project, ProjectStatus } from '@/types'

export function CreateProjectDialog({
  onProjectCreated,
}: {
  onProjectCreated: (project: Project) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [status, setStatus] = useState<ProjectStatus>('active')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !client.trim()) {
      toast.error('Project name and client are required.')
      return
    }

    setLoading(true)
    try {
      const created = await projectService.create({
        name,
        client,
        description,
        startDate,
        status,
      })
      toast.success(`Project "${created.name}" created successfully!`)
      onProjectCreated(created)
      setOpen(false)
      // Reset form
      setName('')
      setClient('')
      setDescription('')
    } catch {
      toast.error('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
          <Plus className="h-3.5 w-3.5" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Create Client Project
            </DialogTitle>
            <DialogDescription className="text-xs">
              Establish a new client engagement baseline to track commitments and scope.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label htmlFor="proj-name" className="text-xs font-semibold text-foreground">
                Project Name *
              </label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ABC E-Commerce Platform"
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="proj-client" className="text-xs font-semibold text-foreground">
                Client / Company *
              </label>
              <Input
                id="proj-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="e.g. Acme Corp"
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="proj-date" className="text-xs font-semibold text-foreground">
                  Start Date
                </label>
                <Input
                  id="proj-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Initial Status
                </label>
                <Select
                  value={status}
                  onValueChange={(val: ProjectStatus) => setStatus(val)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="paused" className="text-xs">Paused</SelectItem>
                    <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="proj-desc" className="text-xs font-semibold text-foreground">
                Scope Description
              </label>
              <Textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of contract objectives, key deliverables, and client constraints..."
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
                  Creating…
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
