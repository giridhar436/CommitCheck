import { useState, useEffect, useMemo } from 'react'
import { Search, FolderKanban } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ProjectCard } from '@/components/projects/project-card'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { projectService } from '@/services/projects'
import type { Project, ProjectStatus, RiskLevel } from '@/types'

export function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')

  const loadProjects = () => {
    projectService.getAll().then((list) => {
      setProjects(list)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || project.status === statusFilter

      const matchesRisk =
        riskFilter === 'all' || project.riskLevel === riskFilter

      return matchesSearch && matchesStatus && matchesRisk
    })
  }, [projects, searchQuery, statusFilter, riskFilter])

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Client Projects
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm leading-relaxed">
            Monitor scope integrity, unauthorized commitments, and client contracts across your portfolio.
          </p>
        </div>

        <CreateProjectDialog
          onProjectCreated={(newProject) => {
            setProjects((prev) => [newProject, ...prev])
          }}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, client, or description…"
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* Filter Badges & Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center rounded-lg border border-border/80 bg-muted/30 p-1 text-xs">
            {(['all', 'active', 'paused', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer capitalize ${
                  statusFilter === status
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center rounded-lg border border-border/80 bg-muted/30 p-1 text-xs">
            {(['all', 'high', 'medium', 'low'] as const).map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer capitalize ${
                  riskFilter === risk
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {risk === 'all' ? 'All Risk' : `${risk} Risk`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects List Content */}
      {loading ? (
        <LoadingState message="Loading client projects..." />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects match your filter"
          description="Try modifying your search query or reset status and risk filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('')
            setStatusFilter('all')
            setRiskFilter('all')
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
