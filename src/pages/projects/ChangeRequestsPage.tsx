import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search,
  Clock,
  CircleCheck,
  CircleX,
  ArrowRight,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProjectNavTabs } from '@/components/projects/project-nav-tabs'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { CopyButton } from '@/components/copy-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { RejectionModal } from '@/components/change-requests/rejection-modal'
import { ApiError } from '@/services/api/client'
import { projectService } from '@/services/projects'
import { changeRequestService } from '@/services/changeRequests'
import type { Project, ChangeRequest, ChangeRequestStatus } from '@/types'

type StatusFilter = 'all' | ChangeRequestStatus

/** List rows carry the commitment context from the backend; fall back when absent. */
const speakerOf = (cr: ChangeRequest) =>
  cr.commitment?.speaker ?? 'Unidentified speaker'

export function ChangeRequestsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter & Search
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Rejection modal
  const [rejectingCr, setRejectingCr] = useState<ChangeRequest | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)

  // In-flight action (buttons disable while a decision is posting)
  const [busyCrId, setBusyCrId] = useState<string | null>(null)

  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [proj, crs] = await Promise.all([
        projectService.getById(id),
        changeRequestService.getAll(id),
      ])

      if (!proj) {
        setError('Project not found')
        return
      }

      setProject(proj)
      setChangeRequests(crs)
    } catch {
      setError('Failed to load change requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Quick Approve action — the backend authorizes the linked commitment
  const handleQuickApprove = async (cr: ChangeRequest) => {
    if (!id) return
    try {
      setBusyCrId(cr.id)
      const updated = await changeRequestService.approve(id, cr.id)
      setChangeRequests((prev) =>
        prev.map((c) => (c.id === cr.id ? updated : c)),
      )
      toast.success(
        `Change Request ${updated.changeRequestId} approved — the linked commitment is now authorized.`,
      )
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to approve change request',
      )
    } finally {
      setBusyCrId(null)
    }
  }

  // Quick Reject action — the commitment stays unauthorized
  const handleConfirmReject = async (reason: string) => {
    if (!id || !rejectingCr) return
    try {
      setBusyCrId(rejectingCr.id)
      const updated = await changeRequestService.reject(id, rejectingCr.id, reason)
      setChangeRequests((prev) =>
        prev.map((c) => (c.id === rejectingCr.id ? updated : c)),
      )
      toast.info(`Change Request ${updated.changeRequestId} rejected: ${reason}`)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to reject change request',
      )
    } finally {
      setBusyCrId(null)
    }
  }

  // Filtered CR list
  const filteredCrs = useMemo(() => {
    return changeRequests.filter((cr) => {
      if (activeFilter !== 'all' && cr.status !== activeFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = cr.title.toLowerCase().includes(q)
        const matchId = cr.changeRequestId.toLowerCase().includes(q)
        const matchPerson = speakerOf(cr).toLowerCase().includes(q)
        if (!matchTitle && !matchId && !matchPerson) return false
      }

      return true
    })
  }, [changeRequests, activeFilter, searchQuery])

  // Metrics
  const totalCount = changeRequests.length
  const pendingCount = changeRequests.filter((c) => c.status === 'pending_approval').length
  const clarificationCount = changeRequests.filter((c) => c.status === 'clarification_requested').length
  const approvedCount = changeRequests.filter((c) => c.status === 'approved').length
  const rejectedCount = changeRequests.filter((c) => c.status === 'rejected').length

  if (loading) return <LoadingState message="Loading change requests & approvals..." />
  if (error || !project) {
    return <ErrorState title="Failed to load project" message={error || 'Project not found'} onRetry={fetchData} />
  }

  const decisionOf = (cr: ChangeRequest) =>
    cr.status === 'approved'
      ? { icon: CircleCheck, text: cr.decisionReason || 'Approved — commitment authorized', tone: 'emerald' as const }
      : cr.status === 'rejected'
        ? { icon: CircleX, text: cr.decisionReason || 'Rejected — commitment unauthorized', tone: 'red' as const }
        : null

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/projects')}>
              Projects
            </span>
            <span>/</span>
            <span
              className="hover:text-foreground cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              {project.name}
            </span>
            <span>/</span>
            <span className="text-foreground font-medium">Change Requests</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Scope Change Orders
            </h1>
            <Badge variant="outline" className="border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-xs font-semibold">
              Contract Approvals
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Approving a change request authorizes the linked commitment for work; rejecting it keeps the commitment unauthorized.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}/commitments`)}
            className="gap-1.5 text-xs font-medium"
          >
            <span>Browse Flagged Commitments</span>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Button>
        </div>
      </div>

      {/* Project Navigation Tabs */}
      <ProjectNavTabs projectId={project.id} />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">Total Change Requests</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-foreground">{totalCount}</span>
            <span className="text-[11px] text-muted-foreground font-medium">All lifecycle states</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} /> Awaiting Decision
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {pendingCount + clarificationCount}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600/80">
              {clarificationCount > 0 ? `${pendingCount} pending · ${clarificationCount} clarif.` : 'Awaiting Approval'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.8} /> Approved Scope Addendums
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {approvedCount}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">Authorized for work</span>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <CircleX className="h-3.5 w-3.5" strokeWidth={1.8} /> Deflected Creep (Rejected)
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {rejectedCount}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">Commitment stays unauthorized</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className="h-8 text-xs font-medium rounded-lg"
          >
            All ({totalCount})
          </Button>
          <Button
            variant={activeFilter === 'pending_approval' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('pending_approval')}
            className={`h-8 text-xs font-medium rounded-lg ${
              activeFilter === 'pending_approval'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            Pending ({pendingCount})
          </Button>
          {clarificationCount > 0 && (
            <Button
              variant={activeFilter === 'clarification_requested' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('clarification_requested')}
              className={`h-8 text-xs font-medium rounded-lg ${
                activeFilter === 'clarification_requested'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'text-blue-600 dark:text-blue-400 border-blue-500/30'
              }`}
            >
              Clarification ({clarificationCount})
            </Button>
          )}
          <Button
            variant={activeFilter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('approved')}
            className={`h-8 text-xs font-medium rounded-lg ${
              activeFilter === 'approved'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
          >
            Approved ({approvedCount})
          </Button>
          <Button
            variant={activeFilter === 'rejected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('rejected')}
            className={`h-8 text-xs font-medium rounded-lg ${
              activeFilter === 'rejected'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'text-red-600 dark:text-red-400 border-red-500/30'
            }`}
          >
            Rejected ({rejectedCount})
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search change requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Change Requests Table */}
      {filteredCrs.length === 0 ? (
        <EmptyState
          title="No change requests found"
          description={
            searchQuery
              ? `No results matching "${searchQuery}".`
              : 'Convert flagged scope creep commitments into change requests to get client sign-off.'
          }
          actionLabel="Clear Filters"
          onAction={() => {
            setActiveFilter('all')
            setSearchQuery('')
          }}
        />
      ) : (
        <>
          {/* Mobile Touch Cards (< md) */}
          <div className="md:hidden space-y-3">
            {filteredCrs.map((cr) => {
              const decision = decisionOf(cr)
              return (
                <div
                  key={cr.id}
                  onClick={() => navigate(`/change-requests/${cr.id}`)}
                  className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/50 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {cr.changeRequestId}
                      </span>
                      <CopyButton
                        text={cr.changeRequestId}
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      />
                    </div>
                    <StatusBadge status={cr.status} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-foreground leading-snug">
                      {cr.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {cr.meetingTitle ?? 'Unrecorded meeting'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      <span className="font-medium text-foreground">{speakerOf(cr)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Deadline: not specified</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-[11px]">
                      {decision ? (
                        <decision.icon
                          className={`h-3.5 w-3.5 inline ${
                            decision.tone === 'emerald'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        />
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {(cr.status === 'pending_approval' || cr.status === 'clarification_requested') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                            disabled={busyCrId === cr.id}
                            onClick={() => handleQuickApprove(cr)}
                          >
                            <CircleCheck className="h-3 w-3" strokeWidth={1.8} />
                            <span>{busyCrId === cr.id ? 'Approving…' : 'Approve'}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 font-medium text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                            disabled={busyCrId === cr.id}
                            onClick={() => {
                              setRejectingCr(cr)
                              setRejectModalOpen(true)
                            }}
                          >
                            <CircleX className="h-3 w-3" strokeWidth={1.8} />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2.5 font-semibold gap-1 shrink-0"
                        onClick={() => navigate(`/change-requests/${cr.id}`)}
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 bg-muted/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">CR ID</th>
                    <th className="py-3 px-4 min-w-[220px]">Title & Source</th>
                    <th className="py-3 px-4">Committed By</th>
                    <th className="py-3 px-4">Promised Delivery</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Decision</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCrs.map((cr) => {
                    const decision = decisionOf(cr)
                    return (
                      <tr
                        key={cr.id}
                        className="hover:bg-muted/20 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/change-requests/${cr.id}`)}
                      >
                        {/* CR ID with Copy Button */}
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <span>{cr.changeRequestId}</span>
                            <CopyButton text={cr.changeRequestId} size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" />
                          </div>
                        </td>

                        {/* Title & Source */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors max-w-sm line-clamp-1">
                            {cr.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {cr.meetingTitle ?? 'Unrecorded meeting'}
                          </div>
                        </td>

                        {/* Committed By */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{speakerOf(cr)}</span>
                          </div>
                        </td>

                        {/* Promised Deadline */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Not specified</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={cr.status} />
                        </td>

                        {/* Decision */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-muted-foreground max-w-[220px]">
                          {decision ? (
                            <div
                              className={`flex items-center gap-1 font-medium ${
                                decision.tone === 'emerald'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              <decision.icon className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                              <span className="line-clamp-2">{decision.text}</span>
                            </div>
                          ) : (
                            <span>Awaiting client review</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2.5 font-semibold gap-1 shadow-2xs"
                              onClick={() => navigate(`/change-requests/${cr.id}`)}
                            >
                              <span>Review</span>
                              <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
                            </Button>

                            {/* Quick Approve / Reject while open */}
                            {(cr.status === 'pending_approval' || cr.status === 'clarification_requested') && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                  disabled={busyCrId === cr.id}
                                  onClick={() => handleQuickApprove(cr)}
                                  title="Approve — authorizes the linked commitment"
                                >
                                  <CircleCheck className="h-3 w-3" strokeWidth={1.8} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-2 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                                  disabled={busyCrId === cr.id}
                                  onClick={() => {
                                    setRejectingCr(cr)
                                    setRejectModalOpen(true)
                                  }}
                                  title="Reject Change Request"
                                >
                                  <CircleX className="h-3 w-3" strokeWidth={1.8} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Rejection Rationale Modal */}
      <RejectionModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onConfirm={handleConfirmReject}
      />
    </div>
  )
}
