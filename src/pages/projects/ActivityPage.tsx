import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  History,
  Video,
  ClipboardCheck,
  ShieldAlert,
  FilePenLine,
  CircleCheck,
  ArrowRight,
  Filter,
  Clock,
  Copy,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  CircleX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProjectNavTabs } from '@/components/projects/project-nav-tabs'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { CopyButton } from '@/components/copy-button'
import {
  TimescaleRoot,
  TimescaleTrack,
  TimescaleRail,
  TimescaleItem,
  TimescaleTick,
  TimescaleAge,
  TimescaleContent,
} from '@/components/timescale'
import { projectService } from '@/services/projects'
import { activityService } from '@/services/activity'
import { dashboardService } from '@/services/dashboard'
import { formatTime, formatRelativeTime, formatActivityAction } from '@/lib/utils'
import type { Project, ActivityItem, ActivityAction, DashboardData } from '@/types'

const PAGE_SIZE = 15

/** Server-side filter chips — each maps to one backend ActivityAction. */
const ACTION_FILTERS: Array<{ label: string; action?: ActivityAction }> = [
  { label: 'All Activity' },
  { label: 'Meetings Analyzed', action: 'MEETING_ANALYZED' },
  { label: 'Commitments Detected', action: 'COMMITMENT_DETECTED' },
  { label: 'Scope Verifications', action: 'COMMITMENT_VERIFIED' },
  { label: 'Creep Flags', action: 'COMMITMENT_FLAGGED' },
  { label: 'Change Requests', action: 'CHANGE_REQUEST_CREATED' },
  { label: 'Approvals', action: 'CHANGE_REQUEST_APPROVED' },
]

function getActivityIcon(action: ActivityItem['action']) {
  switch (action) {
    case 'MEETING_ANALYZED':
      return Video
    case 'COMMITMENT_DETECTED':
    case 'COMMITMENT_CREATED':
      return ClipboardCheck
    case 'COMMITMENT_FLAGGED':
      return ShieldAlert
    case 'CHANGE_REQUEST_CREATED':
      return FilePenLine
    case 'CHANGE_REQUEST_APPROVED':
      return CircleCheck
    case 'COMMITMENT_VERIFIED':
      return ListChecks
    default:
      return History
  }
}

function getActivityColor(action: ActivityItem['action']) {
  switch (action) {
    case 'MEETING_ANALYZED':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    case 'COMMITMENT_DETECTED':
    case 'COMMITMENT_CREATED':
      return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
    case 'COMMITMENT_FLAGGED':
      return 'text-red-500 bg-red-500/10 border-red-500/20'
    case 'CHANGE_REQUEST_CREATED':
      return 'text-violet-500 bg-violet-500/10 border-violet-500/20'
    case 'CHANGE_REQUEST_APPROVED':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    case 'COMMITMENT_VERIFIED':
      return 'text-teal-500 bg-teal-500/10 border-teal-500/20'
    default:
      return 'text-primary bg-primary/10 border-primary/20'
  }
}

export function ActivityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [filterType, setFilterType] = useState<'all' | ActivityAction>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const proj = await projectService.getById(id)
      if (!proj) {
        setError('Project not found')
        return
      }
      setProject(proj)

      // KPI numbers come from the aggregated dashboard endpoint; the
      // timeline itself is the paginated audit trail.
      const [dash, actPage] = await Promise.all([
        dashboardService.getOverview(id).catch(() => null),
        activityService.getPaginated(id, {
          page,
          limit: PAGE_SIZE,
          action: filterType === 'all' ? undefined : filterType,
        }),
      ])
      setDashboard(dash)
      setActivityItems(actPage.items)
      setTotalItems(actPage.totalItems)
      setTotalPages(actPage.totalPages)
    } catch {
      setError('Failed to load activity timeline')
    } finally {
      setLoading(false)
    }
  }, [id, page, filterType])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const setFilter = (next: 'all' | ActivityAction) => {
    setFilterType(next)
    setPage(1)
  }

  // Navigation to the related entity's existing page (no duplicate details).
  const handleJumpToRelated = (item: ActivityItem) => {
    if (item.commitmentId) {
      navigate(`/commitments/${item.commitmentId}`)
    } else if (item.changeRequestId) {
      navigate(`/change-requests/${item.changeRequestId}`)
    } else if (item.meetingId) {
      navigate(`/projects/${item.projectId}/meetings`)
    }
  }

  const canJump = (item: ActivityItem) =>
    Boolean(item.commitmentId || item.changeRequestId || item.meetingId)

  // Plain-text audit log for the visible page.
  const auditLogText = useMemo(() => {
    return activityItems
      .map(
        (a) =>
          `[${formatTime(a.createdAt)}] ${formatActivityAction(a.action)}${a.entityTitle ? ` — ${a.entityTitle}` : ''}: ${a.description}`,
      )
      .join('\n')
  }, [activityItems])

  if (loading && activityItems.length === 0) {
    return <LoadingState message="Loading project audit timeline..." />
  }
  if (error || !project) {
    return <ErrorState title="Failed to load project" message={error || 'Project not found'} onRetry={() => { setPage(1); setFilterType('all'); fetchData() }} />
  }

  const summary = dashboard?.summary

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl mx-auto">
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
            <span className="text-foreground font-medium">Activity & Audit</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Audit & Activity Timeline
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              Immutable Traceability
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Chronological audit log written by the backend on every mutation — meeting analyses, scope verifications, scope creep detections, change orders, and client authorizations.
          </p>
        </div>

        {/* Copy Audit Summary Button */}
        <div className="flex items-center gap-2">
          <CopyButton
            text={auditLogText}
            size="sm"
            className="gap-1.5 text-xs font-medium"
            idleIcon={<Copy className="h-3.5 w-3.5" />}
          >
            Copy Audit Log
          </CopyButton>
        </div>
      </div>

      {/* Project Navigation Tabs */}
      <ProjectNavTabs projectId={project.id} />

      {/* KPI Counters — live from the dashboard aggregate */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">Total Logged Events</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-foreground">{totalItems}</span>
            <span className="text-[11px] text-muted-foreground font-medium">this project</span>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.8} /> High-Risk Commitments
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {summary ? summary.highRiskCommitments : '…'}
            </span>
            <span className="text-[10px] uppercase font-bold text-red-600/80">Detected</span>
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
            <CircleX className="h-3.5 w-3.5" strokeWidth={1.8} /> Unauthorized Scope
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
              {summary ? summary.unauthorizedCommitments : '…'}
            </span>
            <span className="text-[10px] uppercase font-bold text-violet-600/80">Intercepted</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.8} /> Signed Authorizations
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {summary ? summary.approvedChangeRequests : '…'}
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-600/80">Baselines Updated</span>
          </div>
        </div>
      </div>

      {/* Filter Chips — server-side action filter */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.8} /> Filter:
        </span>
        {ACTION_FILTERS.map((f) => (
          <Button
            key={f.label}
            variant={(f.action ?? 'all') === filterType ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.action ?? 'all')}
            className="h-7 text-xs font-medium rounded-lg shrink-0"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Timescale Activity Log Card */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Verified Event Stream
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono">
              Page {page} of {totalPages}
            </span>
          </div>
          <CardDescription className="text-xs">
            Every promise, scope comparison, and approval logged with backend timestamps — newest first.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {activityItems.length === 0 ? (
            <EmptyState
              title="No events match this filter"
              description="Switch filters to view recorded meetings, promises, and approvals."
            />
          ) : (
            <TimescaleRoot orientation="vertical" className="w-full">
              <TimescaleRail />
              <TimescaleTrack>
                {activityItems.map((item) => {
                  const Icon = getActivityIcon(item.action)
                  const colorClass = getActivityColor(item.action)

                  return (
                    <TimescaleItem key={item.id} className="pb-6">
                      <TimescaleTick />
                      <TimescaleAge className="text-xs font-mono font-bold text-muted-foreground pt-1">
                        {formatTime(item.createdAt)}
                      </TimescaleAge>
                      <TimescaleContent className="pt-0.5">
                        <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-2xs hover:border-border transition-colors group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${colorClass}`}>
                                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                  {item.entityTitle ?? formatActivityAction(item.action)}
                                </h4>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  {formatActivityAction(item.action)} • {formatRelativeTime(item.createdAt)}
                                </p>
                              </div>
                            </div>

                            {/* Jump to Related Item Button */}
                            {canJump(item) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary shrink-0 opacity-80 group-hover:opacity-100"
                                onClick={() => handleJumpToRelated(item)}
                              >
                                <span>Inspect</span>
                                <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
                              </Button>
                            )}
                          </div>

                          <p className="text-xs leading-relaxed text-muted-foreground mt-2.5 pt-2.5 border-t border-border/50">
                            {item.description}
                          </p>
                        </div>
                      </TimescaleContent>
                    </TimescaleItem>
                  )
                })}
              </TimescaleTrack>
            </TimescaleRoot>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground font-medium">
                Showing {activityItems.length} of {totalItems} events
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
