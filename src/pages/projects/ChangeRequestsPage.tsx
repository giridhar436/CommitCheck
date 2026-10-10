import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
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
import { projectService } from '@/services/projects'
import { changeRequestService } from '@/services/changeRequests'
import type { Project, ChangeRequest } from '@/types'

export function ChangeRequestsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter & Search
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'pending_approval' | 'approved' | 'rejected' | 'draft' | 'implemented'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Rejection modal
  const [rejectingCr, setRejectingCr] = useState<ChangeRequest | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)

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

  // Quick Approve action
  const handleQuickApprove = async (crId: string) => {
    try {
      const updated = await changeRequestService.updateStatus(crId, 'approved')
      setChangeRequests((prev) =>
        prev.map((c) => (c.id === crId ? updated : c)),
      )
      toast.success(`Change Request ${updated.changeRequestId} approved!`)
    } catch {
      toast.error('Failed to approve change request')
    }
  }

  // Quick Reject action
  const handleConfirmReject = async (reason: string) => {
    if (!rejectingCr) return
    try {
      const updated = await changeRequestService.updateStatus(rejectingCr.id, 'rejected', reason)
      setChangeRequests((prev) =>
        prev.map((c) => (c.id === rejectingCr.id ? updated : c)),
      )
      toast.info(`Change Request ${updated.changeRequestId} rejected: ${reason}`)
    } catch {
      toast.error('Failed to reject change request')
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
        const matchFeature = cr.feature.toLowerCase().includes(q)
        const matchPerson = cr.committedBy.toLowerCase().includes(q)
        if (!matchTitle && !matchId && !matchFeature && !matchPerson) return false
      }

      return true
    })
  }, [changeRequests, activeFilter, searchQuery])

  // Metrics
  const totalCount = changeRequests.length
  const pendingCount = changeRequests.filter((c) => c.status === 'pending_approval').length
  const approvedCount = changeRequests.filter((c) => c.status === 'approved' || c.status === 'implemented').length
  const rejectedCount = changeRequests.filter((c) => c.status === 'rejected').length

  if (loading) return <LoadingState message="Loading change requests & approvals..." />
  if (error || !project) {
    return <ErrorState title="Failed to load project" message={error || 'Project not found'} onRetry={fetchData} />
  }

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
            Manage scope addendums, track client approvals, and ensure every verbal promise is formally authorized and funded before work implementation.
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
            <ArrowRight className="h-3.5 w-3.5" />
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
            <Clock className="h-3.5 w-3.5" /> Pending Client Sign-Off
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {pendingCount}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600/80">Awaiting Approval</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved Scope Addendums
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
            <XCircle className="h-3.5 w-3.5" /> Deflected Creep (Rejected)
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {rejectedCount}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">Saved budget</span>
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
            {filteredCrs.map((cr) => (
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
                    {cr.feature}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    <span className="font-medium text-foreground">{cr.committedBy}</span>
                  </div>
                  {cr.promisedDeadline && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{cr.promisedDeadline}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-[11px]">
                    <span className="text-muted-foreground">Effort: </span>
                    <span className="font-medium text-foreground">{cr.estimatedEffort || 'TBD'}</span>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {cr.status === 'pending_approval' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                          onClick={() => handleQuickApprove(cr.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 font-medium text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => {
                            setRejectingCr(cr)
                            setRejectModalOpen(true)
                          }}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2.5 font-semibold gap-1 shrink-0"
                      onClick={() => navigate(`/change-requests/${cr.id}`)}
                    >
                      <span>View</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 bg-muted/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">CR ID</th>
                    <th className="py-3 px-4 min-w-[220px]">Title & Feature</th>
                  <th className="py-3 px-4">Committed By</th>
                  <th className="py-3 px-4">Promised Delivery</th>
                  <th className="py-3 px-4">Estimated Effort</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Approval Info</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCrs.map((cr) => (
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

                    {/* Title & Feature */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors max-w-sm line-clamp-1">
                        {cr.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {cr.feature}
                      </div>
                    </td>

                    {/* Committed By */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{cr.committedBy}</span>
                      </div>
                    </td>

                    {/* Promised Deadline */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{cr.promisedDeadline || 'Not specified'}</span>
                      </div>
                    </td>

                    {/* Estimated Effort */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-foreground">
                        {cr.estimatedEffort || 'TBD'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={cr.status} />
                    </td>

                    {/* Approval Info */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-muted-foreground">
                      {cr.approvedBy ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{cr.approvedBy}</span>
                        </div>
                      ) : cr.rejectedBy ? (
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" />
                          <span>{cr.rejectedBy}</span>
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
                          <ArrowRight className="h-3 w-3" />
                        </Button>

                        {/* Quick Approve / Reject if pending */}
                        {cr.status === 'pending_approval' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              onClick={() => handleQuickApprove(cr.id)}
                              title="Approve Change Request"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => {
                                setRejectingCr(cr)
                                setRejectModalOpen(true)
                              }}
                              title="Reject Change Request"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
