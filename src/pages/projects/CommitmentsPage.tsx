import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search,
  AlertTriangle,
  FileQuestion,
  ArrowRight,
  GitPullRequestDraft,
  ShieldCheck,
  ShieldX,
  Calendar,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProjectNavTabs } from '@/components/projects/project-nav-tabs'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { CopyButton } from '@/components/copy-button'
import { RiskBadge } from '@/components/ui/risk-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { CreateChangeRequestDialog } from '@/components/commitments/create-change-request-dialog'
import { projectService } from '@/services/projects'
import { commitmentService } from '@/services/commitments'
import { meetingService } from '@/services/meetings'
import type { Project, Commitment, Meeting } from '@/types'

export function CommitmentsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [meetings, setMeetings] = useState<Record<string, Meeting>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'high_risk' | 'unauthorized' | 'needs_review' | 'authorized'
  >('all')

  // Change Request dialog
  const [crDialogOpen, setCrDialogOpen] = useState(false)
  const [selectedCommitmentForCr, setSelectedCommitmentForCr] = useState<Commitment | null>(null)

  // Data fetching
  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [proj, comms, meets] = await Promise.all([
        projectService.getById(id),
        commitmentService.getAll(id),
        meetingService.getAll(id),
      ])

      if (!proj) {
        setError('Project not found')
        return
      }

      setProject(proj)
      setCommitments(comms)

      // Map meetings by id
      const meetMap: Record<string, Meeting> = {}
      meets.forEach((m) => {
        meetMap[m.id] = m
      })
      setMeetings(meetMap)
    } catch {
      setError('Failed to load commitments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Filter & Search logic
  const filteredCommitments = useMemo(() => {
    return commitments.filter((comm) => {
      // Filter tab
      if (activeFilter === 'high_risk' && comm.riskLevel !== 'high') return false
      if (activeFilter === 'unauthorized' && comm.authorization !== 'unauthorized') return false
      if (activeFilter === 'needs_review' && comm.status !== 'needs_review') return false
      if (activeFilter === 'authorized' && comm.authorization !== 'authorized') return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = comm.commitment.toLowerCase().includes(q)
        const matchId = comm.commitmentId.toLowerCase().includes(q)
        const matchPerson = comm.committedBy.toLowerCase().includes(q)
        const matchEvidence = comm.evidence.toLowerCase().includes(q)
        if (!matchTitle && !matchId && !matchPerson && !matchEvidence) return false
      }

      return true
    })
  }, [commitments, activeFilter, searchQuery])

  // Metrics calculation
  const totalCount = commitments.length
  const highRiskCount = commitments.filter((c) => c.riskLevel === 'high').length
  const unauthorizedCount = commitments.filter((c) => c.authorization === 'unauthorized').length
  const needsReviewCount = commitments.filter((c) => c.status === 'needs_review').length
  const authorizedCount = commitments.filter((c) => c.authorization === 'authorized').length

  if (loading) return <LoadingState message="Loading detected commitments..." />
  if (error || !project) {
    return <ErrorState title="Failed to load project" message={error || 'Project not found'} onRetry={fetchData} />
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Breadcrumb & Title */}
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
            <span className="text-foreground font-medium">Commitments</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Detected Commitments
            </h1>
            <Badge variant="outline" className="border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 text-xs font-semibold">
              Scope Verification
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Audit extracted promises, compare them against approved SOW clauses, and formalize unapproved commitments into change requests before engineering begins.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}/meetings`)}
            className="gap-1.5 text-xs font-medium"
          >
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Analyze New Meeting</span>
          </Button>
        </div>
      </div>

      {/* Project Navigation Tabs */}
      <ProjectNavTabs projectId={project.id} />

      {/* KPI Metric Header Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">Total Promises Extracted</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-foreground">{totalCount}</span>
            <span className="text-[11px] text-muted-foreground font-medium">All meetings</span>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> High Risk Scope Creep
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {highRiskCount}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-red-600/80">Immediate Action</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <FileQuestion className="h-3.5 w-3.5" /> Awaiting Review
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {needsReviewCount}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">Pending sign-off</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Authorized in Scope
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {authorizedCount}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">Verified in SOW</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
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
            variant={activeFilter === 'high_risk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('high_risk')}
            className={`h-8 text-xs font-medium rounded-lg ${
              activeFilter === 'high_risk'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10'
            }`}
          >
            High Risk ({highRiskCount})
          </Button>
          <Button
            variant={activeFilter === 'unauthorized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('unauthorized')}
            className={`h-8 text-xs font-medium rounded-lg ${
              activeFilter === 'unauthorized'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10'
            }`}
          >
            Unauthorized ({unauthorizedCount})
          </Button>
          <Button
            variant={activeFilter === 'needs_review' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('needs_review')}
            className="h-8 text-xs font-medium rounded-lg"
          >
            Needs Review ({needsReviewCount})
          </Button>
          <Button
            variant={activeFilter === 'authorized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('authorized')}
            className="h-8 text-xs font-medium rounded-lg text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
          >
            Authorized ({authorizedCount})
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search commitments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Main Commitments Table / Card List */}
      {filteredCommitments.length === 0 ? (
        <EmptyState
          title="No commitments match your filter"
          description={
            searchQuery
              ? `No commitments matching "${searchQuery}".`
              : 'Try changing the filter or analyzing another client meeting.'
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
            {filteredCommitments.map((comm) => (
              <div
                key={comm.id}
                onClick={() => navigate(`/commitments/${comm.id}`)}
                className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/50 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {comm.commitmentId}
                    </span>
                    <CopyButton
                      text={comm.commitmentId}
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RiskBadge level={comm.riskLevel} />
                    <StatusBadge status={comm.status} />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-foreground leading-snug">
                    {comm.commitment}
                  </h3>
                  <p className="text-xs text-muted-foreground italic font-serif mt-1 line-clamp-2">
                    {comm.evidence}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    <span className="font-medium text-foreground">{comm.committedBy}</span>
                  </div>
                  {comm.deadline && (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      Due: {comm.deadline}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    {comm.scopeMatch === 'matched' ? (
                      <Badge className="bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        Approved SOW
                      </Badge>
                    ) : comm.scopeMatch === 'partial' ? (
                      <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                        Partial Match
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-bold">
                        Not in Scope
                      </Badge>
                    )}
                    {comm.authorization === 'authorized' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium flex items-center gap-0.5">
                        <ShieldCheck className="h-3 w-3" /> Authorized
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center gap-0.5">
                        <ShieldX className="h-3 w-3" /> Unauthorized
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {comm.authorization === 'unauthorized' && comm.status !== 'change_request_created' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 font-medium gap-1 text-primary border-primary/30"
                        onClick={() => {
                          setSelectedCommitmentForCr(comm)
                          setCrDialogOpen(true)
                        }}
                      >
                        <GitPullRequestDraft className="h-3 w-3" />
                        <span>CR</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2.5 font-semibold gap-1 shrink-0"
                      onClick={() => navigate(`/commitments/${comm.id}`)}
                    >
                      <span>Review</span>
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
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4 min-w-[220px]">Commitment</th>
                  <th className="py-3 px-4">Committed By</th>
                  <th className="py-3 px-4">Meeting Source</th>
                  <th className="py-3 px-4">Scope Match</th>
                  <th className="py-3 px-4">Authorization</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCommitments.map((comm) => {
                  const meeting = meetings[comm.meetingId]

                  return (
                    <tr
                      key={comm.id}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/commitments/${comm.id}`)}
                    >
                      {/* ID with Copy Button */}
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <span>{comm.commitmentId}</span>
                          <CopyButton text={comm.commitmentId} size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" />
                        </div>
                      </td>

                      {/* Commitment Title & Evidence */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground max-w-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {comm.commitment}
                        </div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1 italic mt-0.5 max-w-sm font-serif">
                          {comm.evidence}
                        </div>
                      </td>

                      {/* Committed By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{comm.committedBy}</span>
                        </div>
                        {comm.deadline && (
                          <div className="text-[10px] text-muted-foreground">
                            Due: {comm.deadline}
                          </div>
                        )}
                      </td>

                      {/* Source Meeting */}
                      <td className="py-3.5 px-4 max-w-[160px] truncate">
                        <span className="text-foreground font-medium truncate block">
                          {meeting?.title || 'Client Meeting'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {meeting?.date || 'Recent'}
                        </span>
                      </td>

                      {/* Scope Match */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {comm.scopeMatch === 'matched' ? (
                          <Badge className="bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                            Approved SOW
                          </Badge>
                        ) : comm.scopeMatch === 'partial' ? (
                          <Badge className="bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                            Partial Match
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-bold">
                            Not in Scope
                          </Badge>
                        )}
                      </td>

                      {/* Authorization */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {comm.authorization === 'authorized' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                            <ShieldCheck className="h-3 w-3" /> Authorized
                          </span>
                        ) : comm.authorization === 'pending' ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                            <AlertTriangle className="h-3 w-3" /> Pending Sign-off
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[11px]">
                            <ShieldX className="h-3 w-3" /> Not Authorized
                          </span>
                        )}
                      </td>

                      {/* Risk */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <RiskBadge level={comm.riskLevel} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={comm.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Main [Review] CTA per PRD */}
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2.5 font-semibold gap-1 shadow-2xs"
                            onClick={() => navigate(`/commitments/${comm.id}`)}
                          >
                            <span>Review</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>

                          {/* Quick Change Request Trigger */}
                          {comm.authorization === 'unauthorized' && comm.status !== 'change_request_created' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/10 gap-1"
                              onClick={() => {
                                setSelectedCommitmentForCr(comm)
                                setCrDialogOpen(true)
                              }}
                              title="Create Change Request"
                            >
                              <GitPullRequestDraft className="h-3 w-3" />
                              <span className="hidden xl:inline">CR</span>
                            </Button>
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

      {/* Change Request Creation Dialog */}
      <CreateChangeRequestDialog
        commitment={selectedCommitmentForCr}
        open={crDialogOpen}
        onOpenChange={setCrDialogOpen}
        onCreated={() => {
          fetchData()
        }}
      />
    </div>
  )
}
