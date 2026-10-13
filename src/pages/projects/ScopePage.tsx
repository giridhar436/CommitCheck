import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search,
  FileCheck2,
  FileText,
  ChevronRight,
  Filter,
  Pencil,
  Trash2,
  Eye,
  X,
  ShieldOff,
  ArrowUpDown,
  CircleCheck,
  CircleAlert,
  CircleX,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ProjectNavTabs } from '@/components/projects/project-nav-tabs'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { AddRequirementDialog } from '@/components/scope/add-requirement-dialog'
import { projectService } from '@/services/projects'
import { scopeService } from '@/services/scope'
import type { Project, Requirement, RequirementStatus, RequirementPriority } from '@/types'

/* ——— Helpers ——— */

const statusConfig: Record<RequirementStatus, { label: string; icon: React.ElementType; className: string }> = {
  approved: {
    label: 'Approved',
    icon: CircleCheck,
    className: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  pending: {
    label: 'Pending',
    icon: CircleAlert,
    className: 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  rejected: {
    label: 'Rejected',
    icon: CircleX,
    className: 'bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/20',
  },
  not_in_scope: {
    label: 'Not in Scope',
    icon: ShieldOff,
    className: 'bg-zinc-500/12 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
  },
}

const priorityConfig: Record<RequirementPriority, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-500/12 text-red-600 dark:text-red-400' },
  medium: { label: 'Medium', className: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', className: 'bg-blue-500/12 text-blue-600 dark:text-blue-400' },
}

/* ——— Scope Page ——— */

export function ScopePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'name' | 'priority' | 'status' | 'category'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Edit/inspect state
  const [editReq, setEditReq] = useState<Requirement | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [inspecting, setInspecting] = useState<Requirement | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([projectService.getById(id), scopeService.getRequirements(id)]).then(
      ([proj, reqs]) => {
        setProject(proj)
        setRequirements(reqs)
        setLoading(false)
      },
    )
  }, [id])

  /* ——— Derived Data ——— */

  const filtered = useMemo(() => {
    let list = [...requirements]

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.source.toLowerCase().includes(q),
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      list = list.filter((r) => r.priority === priorityFilter)
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      return av < bv ? -dir : av > bv ? dir : 0
    })

    return list
  }, [requirements, searchQuery, statusFilter, priorityFilter, sortField, sortDir])

  const approvedCount = requirements.filter((r) => r.status === 'approved').length
  const pendingCount = requirements.filter((r) => r.status === 'pending').length
  const excludedCount = requirements.filter((r) => r.status === 'not_in_scope').length

  /* ——— Handlers ——— */

  const handleSaved = (req: Requirement) => {
    setRequirements((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === req.id)
      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx] = req
        return updated
      }
      return [...prev, req]
    })
    setEditReq(null)
    setEditDialogOpen(false)
  }

  const handleDelete = async (req: Requirement) => {
    try {
      await scopeService.deleteRequirement(id!, req.id)
      setRequirements((prev) => prev.filter((r) => r.id !== req.id))
      setInspecting(null)
      toast.success(`Requirement "${req.name}" removed from scope.`)
    } catch {
      toast.error('Failed to delete requirement.')
    }
  }

  const openEdit = (req: Requirement) => {
    setEditReq(req)
    setEditDialogOpen(true)
  }

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  /* ——— Loading / Error ——— */

  if (loading) return <LoadingState message="Loading approved scope…" />

  if (!project) {
    return (
      <ErrorState
        title="Project Not Found"
        message="The requested client project could not be located."
        action={
          <Button onClick={() => navigate('/projects')} size="sm">
            Back to Projects
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Define and manage the contractually approved scope. Commitments detected from meetings
            are automatically compared against these requirements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <AddRequirementDialog projectId={project.id} onSaved={handleSaved} myRole={project.myRole} />
        </div>
      </div>

      {/* Sub-Navigation */}
      <ProjectNavTabs projectId={project.id} />

      {/* Stats Badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2">
          <CircleCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.8} />
          <span className="text-xs font-semibold text-foreground">{approvedCount}</span>
          <span className="text-xs text-muted-foreground">Approved</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2">
          <CircleAlert className="h-3.5 w-3.5 text-amber-500" strokeWidth={1.8} />
          <span className="text-xs font-semibold text-foreground">{pendingCount}</span>
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2">
          <ShieldOff className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.8} />
          <span className="text-xs font-semibold text-foreground">{excludedCount}</span>
          <span className="text-xs text-muted-foreground">Excluded / Out of Scope</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2">
          <FileCheck2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
          <span className="text-xs font-semibold text-foreground">{requirements.length}</span>
          <span className="text-xs text-muted-foreground">Total Catalog</span>
        </div>
      </div>

      {/* Benchmark Demo Notice: Explicit Scope Boundaries */}
      <div className="rounded-xl border border-border/80 bg-gradient-to-r from-card via-muted/30 to-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center shrink-0 mt-0.5 text-zinc-600 dark:text-zinc-400">
            <ShieldOff className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">SOW Contract Scope Boundaries</span>
              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25 font-bold">
                Google Login: Excluded from Phase 1
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Approved SOW Section 3.1 authorizes <strong>Email & Password Authentication</strong> only.
              OAuth social login is explicitly <strong>excluded</strong>. Any verbal commitments to deliver Google Login will trigger high-risk scope creep alerts.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs shrink-0 h-8"
          onClick={() => setStatusFilter(statusFilter === 'not_in_scope' ? 'all' : 'not_in_scope')}
        >
          {statusFilter === 'not_in_scope' ? 'Show All Requirements' : 'View Exclusions (1)'}
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requirements by name, description, category, or source…"
            className="pl-9 text-xs h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="approved" className="text-xs">Approved</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
              <SelectItem value="not_in_scope" className="text-xs">Not in Scope</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[120px] text-xs h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
              <SelectItem value="high" className="text-xs">High</SelectItem>
              <SelectItem value="medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="low" className="text-xs">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content: Requirements Table + Inspect Panel */}
      <div className={cn('grid gap-6 transition-all', inspecting ? 'lg:grid-cols-[1fr_380px]' : 'lg:grid-cols-1')}>
        {/* Requirements Table */}
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="pb-0 px-0 pt-0">
            {/* Table Header (Desktop Only) */}
            <div className="hidden md:grid grid-cols-[1fr_120px_100px_100px_100px] gap-2 px-5 py-3 bg-muted/30 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <button
                onClick={() => toggleSort('name')}
                className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
              >
                Requirement
                <ArrowUpDown className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => toggleSort('category')}
                className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
              >
                Category
                <ArrowUpDown className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => toggleSort('priority')}
                className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
              >
                Priority
                <ArrowUpDown className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => toggleSort('status')}
                className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
              >
                Status
                <ArrowUpDown className="h-2.5 w-2.5" />
              </button>
              <span className="text-right">Actions</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Requirements Found"
                  description={
                    searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? 'No requirements match your current filters. Try adjusting your search.'
                      : 'No requirements have been added yet. Start by defining the approved project scope.'
                  }
                  action={
                    !searchQuery && statusFilter === 'all' && priorityFilter === 'all' ? (
                      <AddRequirementDialog projectId={project.id} onSaved={handleSaved} myRole={project.myRole} />
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <>
                {/* Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-border/40">
                  {filtered.map((req) => {
                    const sc = statusConfig[req.status]
                    const pc = priorityConfig[req.priority]
                    const StatusIcon = sc.icon
                    const isInspecting = inspecting?.id === req.id

                    return (
                      <div
                        key={req.id}
                        className={cn(
                          'p-4 space-y-2.5 transition-colors cursor-pointer',
                          isInspecting ? 'bg-primary/5' : 'hover:bg-muted/20',
                        )}
                        onClick={() => setInspecting(isInspecting ? null : req)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-xs text-foreground leading-snug">
                              {req.name}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {req.category} &bull; {req.source}
                            </p>
                            {req.sourceDocument && (
                              <p className="text-[10px] text-primary/80 flex items-center gap-1 mt-0.5">
                                <FileText className="h-3 w-3 shrink-0" />
                                {req.sourceDocument.title}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEdit(req)}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                              aria-label="Edit requirement"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(req)}
                              className="p-1 rounded-md text-muted-foreground hover:text-red-500"
                              aria-label="Delete requirement"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {req.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {req.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 w-fit', pc.className)}>
                              {pc.label}
                            </Badge>
                            <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 w-fit gap-1 border', sc.className)}>
                              <StatusIcon className="h-3 w-3" strokeWidth={1.8} />
                              {sc.label}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-2 text-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              setInspecting(isInspecting ? null : req)
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {isInspecting ? 'Close' : 'Details'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop Grid Rows (>= md) */}
                <div className="hidden md:block divide-y divide-border/40">
                  {filtered.map((req) => {
                    const sc = statusConfig[req.status]
                    const pc = priorityConfig[req.priority]
                    const StatusIcon = sc.icon
                    const isInspecting = inspecting?.id === req.id

                    return (
                      <div
                        key={req.id}
                        className={cn(
                          'grid grid-cols-[1fr_120px_100px_100px_100px] gap-2 items-center px-5 py-3.5 text-xs transition-colors cursor-pointer group',
                          isInspecting
                            ? 'bg-primary/5 border-l-2 border-l-primary'
                            : 'hover:bg-muted/30 border-l-2 border-l-transparent',
                        )}
                        onClick={() => setInspecting(isInspecting ? null : req)}
                      >
                        {/* Requirement Name + Source */}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{req.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {req.source}
                          </p>
                          {req.sourceDocument && (
                            <p className="text-[10px] text-primary/80 truncate mt-0.5 flex items-center gap-1">
                              <FileText className="h-3 w-3 shrink-0" />
                              {req.sourceDocument.title}
                            </p>
                          )}
                        </div>

                        {/* Category */}
                        <span className="text-muted-foreground truncate">{req.category}</span>

                        {/* Priority */}
                        <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 w-fit', pc.className)}>
                          {pc.label}
                        </Badge>

                        {/* Status */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 w-fit gap-1 border', sc.className)}>
                                <StatusIcon className="h-3 w-3" strokeWidth={1.8} />
                                {sc.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Approval Status: {sc.label}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setInspecting(req)
                                  }}
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Inspect</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEdit(req)
                                  }}
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Edit</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(req)
                                  }}
                                  className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Remove</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Inspect Panel (Slide-in from right) */}
        {inspecting && (
          <Card className="border-border/80 shadow-xs self-start sticky top-4 animate-fade-in">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground">
                  Requirement Details
                </CardTitle>
                <button
                  onClick={() => setInspecting(null)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Name & Status */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-foreground">{inspecting.name}</h3>
                <div className="flex items-center gap-2">
                  {(() => {
                    const sc = statusConfig[inspecting.status]
                    const StatusIcon = sc.icon
                    return (
                      <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 gap-1 border', sc.className)}>
                        <StatusIcon className="h-3 w-3" strokeWidth={1.8} />
                        {sc.label}
                      </Badge>
                    )
                  })()}
                  <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5', priorityConfig[inspecting.priority].className)}>
                    {priorityConfig[inspecting.priority].label} Priority
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Details */}
              <div className="space-y-3">
                <DetailRow label="Category" value={inspecting.category} />
                <DetailRow label="Source / SOW Clause" value={inspecting.source} />
                {inspecting.sourceDocument && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Source Document
                    </span>
                    <p className="text-xs text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      {inspecting.sourceDocument.title}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Description & Acceptance Criteria
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">
                    {inspecting.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Scope Verification Context */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <FileCheck2 className="h-3 w-3 text-primary" strokeWidth={1.8} />
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                    Scope Verification Note
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  When CommitCheck detects a verbal commitment matching <strong className="text-foreground">"{inspecting.name}"</strong>,
                  it will be classified as <strong className="text-emerald-500">within approved scope</strong> and
                  automatically authorized.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 flex-1"
                  onClick={() => openEdit(inspecting)}
                >
                  <Pencil className="mr-1.5 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                  onClick={() => handleDelete(inspecting)}
                >
                  <Trash2 className="mr-1.5 h-3 w-3" />
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scope Importance Callout */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 shrink-0">
          <FileCheck2 className="h-4 w-4 text-primary" strokeWidth={1.8} />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-semibold text-foreground">
            Why Scope Accuracy Matters
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            CommitCheck compares every verbal commitment detected from meeting transcripts against
            this approved scope. Incomplete or inaccurate scope definitions may cause false positives
            or missed scope creep. For best results, ensure all signed SOW clauses are represented as
            requirements.
          </p>
          <button
            onClick={() => navigate(`/projects/${project.id}/documents`)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1"
          >
            Upload scope documents
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Edit Dialog (Controlled) */}
      <AddRequirementDialog
        projectId={project.id}
        requirementToEdit={editReq}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSaved={handleSaved}
        myRole={project.myRole}
      />
    </div>
  )
}

/* ——— Small helper component ——— */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className="text-xs text-foreground">{value}</p>
    </div>
  )
}
