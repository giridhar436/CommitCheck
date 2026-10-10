import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  History,
  Video,
  ClipboardCheck,
  ShieldAlert,
  FilePenLine,
  CircleCheck,
  User,
  ArrowRight,
  Filter,
  Clock,
  Copy,
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
import { formatTime } from '@/lib/utils'
import type { Project, ActivityItem } from '@/types'

export function ActivityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [filterType, setFilterType] = useState<
    'all' | 'meeting' | 'commitment' | 'change_request'
  >('all')

  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [proj, acts] = await Promise.all([
        projectService.getById(id),
        activityService.getAll(id),
      ])

      if (!proj) {
        setError('Project not found')
        return
      }

      setProject(proj)
      setActivityItems(acts)
    } catch {
      setError('Failed to load activity timeline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Filtered items
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return activityItems

    return activityItems.filter((item) => {
      if (filterType === 'meeting') return item.type === 'meeting_analyzed'
      if (filterType === 'commitment')
        return item.type === 'commitment_detected' || item.type === 'commitment_flagged'
      if (filterType === 'change_request')
        return item.type === 'change_request_created' || item.type === 'change_request_approved'
      return true
    })
  }, [activityItems, filterType])

  // Get icon by activity type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'meeting_analyzed':
        return Video
      case 'commitment_detected':
        return ClipboardCheck
      case 'commitment_flagged':
        return ShieldAlert
      case 'change_request_created':
        return FilePenLine
      case 'change_request_approved':
        return CircleCheck
      default:
        return History
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'meeting_analyzed':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      case 'commitment_detected':
        return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
      case 'commitment_flagged':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'change_request_created':
        return 'text-violet-500 bg-violet-500/10 border-violet-500/20'
      case 'change_request_approved':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
      default:
        return 'text-primary bg-primary/10 border-primary/20'
    }
  }

  // Handle jump navigation to related object
  const handleJumpToRelated = (item: ActivityItem) => {
    if (item.relatedType === 'meeting') {
      navigate(`/projects/${project?.id}/meetings`)
    } else if (item.relatedType === 'commitment') {
      navigate(`/commitments/${item.relatedId || 'comm-google-login'}`)
    } else if (item.relatedType === 'change_request') {
      navigate(`/change-requests/${item.relatedId || 'cr-google-login'}`)
    }
  }

  // Generate plain text log for copying
  const auditLogText = useMemo(() => {
    return activityItems
      .map(
        (a) =>
          `[${formatTime(a.timestamp)}] ${a.title} - ${a.description} (Actor: ${a.actor || 'System'})`,
      )
      .join('\n')
  }, [activityItems])

  if (loading) return <LoadingState message="Loading project audit timeline..." />
  if (error || !project) {
    return <ErrorState title="Failed to load project" message={error || 'Project not found'} onRetry={fetchData} />
  }

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
            Chronological audit log tracking meeting analyses, scope creep detections, change order requests, and client authorizations.
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

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">Total Logged Events</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-foreground">{activityItems.length}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Sprint 3 cycle</span>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.8} /> Scope Creep Flagged
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {activityItems.filter((a) => a.type === 'commitment_flagged').length}
            </span>
            <span className="text-[10px] uppercase font-bold text-red-600/80">Intercepted</span>
          </div>
        </div>

        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
            <FilePenLine className="h-3.5 w-3.5" strokeWidth={1.8} /> Change Requests Created
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
              {activityItems.filter((a) => a.type === 'change_request_created').length}
            </span>
            <span className="text-[10px] uppercase font-bold text-violet-600/80">Formalized</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.8} /> Signed Authorizations
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {activityItems.filter((a) => a.type === 'change_request_approved').length}
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-600/80">Baselines Updated</span>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.8} /> Filter:
        </span>
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
          className="h-7 text-xs font-medium rounded-lg"
        >
          All Activity
        </Button>
        <Button
          variant={filterType === 'meeting' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('meeting')}
          className="h-7 text-xs font-medium rounded-lg"
        >
          Meetings
        </Button>
        <Button
          variant={filterType === 'commitment' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('commitment')}
          className="h-7 text-xs font-medium rounded-lg"
        >
          Commitments & Flags
        </Button>
        <Button
          variant={filterType === 'change_request' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('change_request')}
          className="h-7 text-xs font-medium rounded-lg"
        >
          Change Requests
        </Button>
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
              March 12, 2025
            </span>
          </div>
          <CardDescription className="text-xs">
            Every promise, scope comparison, and approval logged with microsecond timestamps.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {filteredItems.length === 0 ? (
            <EmptyState
              title="No events match this filter"
              description="Switch filters to view recorded meetings, promises, and approvals."
            />
          ) : (
            <TimescaleRoot orientation="vertical" className="w-full">
              <TimescaleRail />
              <TimescaleTrack>
                {filteredItems.map((item) => {
                  const Icon = getActivityIcon(item.type)
                  const colorClass = getActivityColor(item.type)

                  return (
                    <TimescaleItem key={item.id} className="pb-6">
                      <TimescaleTick />
                      <TimescaleAge className="text-xs font-mono font-bold text-muted-foreground pt-1">
                        {formatTime(item.timestamp)}
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
                                  {item.title}
                                </h4>
                                {item.actor && (
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <User className="h-3 w-3" />
                                    <span>Actor: {item.actor}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Jump to Related Item Button */}
                            {item.relatedType && (
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
        </CardContent>
      </Card>
    </div>
  )
}
