import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, ChevronsUpDown, FolderKanban } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RiskBadge } from '@/components/ui/risk-badge'
import { projectService } from '@/services/projects'
import type { Project } from '@/types'

export function ProjectSwitcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    projectService.getAll().then((list) => {
      setProjects(list)
      // Check if URL has a specific project ID
      const match = location.pathname.match(/\/projects\/([^/]+)/)
      const currentId = match ? match[1] : null
      const active = (currentId && list.find((p) => p.id === currentId)) || list[0] || null
      setSelectedProject(active)
    })
  }, [location.pathname])

  const handleSelect = (project: Project) => {
    setSelectedProject(project)
    // If currently on a project sub-page, maintain that tab or go to project overview
    if (location.pathname.includes('/commitments')) {
      navigate(`/projects/${project.id}/commitments`)
    } else if (location.pathname.includes('/scope')) {
      navigate(`/projects/${project.id}/scope`)
    } else if (location.pathname.includes('/meetings')) {
      navigate(`/projects/${project.id}/meetings`)
    } else if (location.pathname.includes('/change-requests')) {
      navigate(`/projects/${project.id}/change-requests`)
    } else if (location.pathname.includes('/documents')) {
      navigate(`/projects/${project.id}/documents`)
    } else {
      navigate(`/projects/${project.id}`)
    }
  }

  if (!selectedProject) {
    return (
      <div className="flex h-11 items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
        <FolderKanban className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-muted-foreground">Loading projects…</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/80 bg-background/60 p-2.5 text-left transition-colors hover:bg-accent/50 cursor-pointer shadow-xs focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Switch project"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-xs">
              {selectedProject.name.charAt(0)}
            </div>
            <div className="truncate">
              <div className="truncate text-xs font-semibold text-foreground">
                {selectedProject.name}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                Client: {selectedProject.client}
              </div>
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-1">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
          Active Client Projects
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((proj) => {
          const isSelected = proj.id === selectedProject.id
          return (
            <DropdownMenuItem
              key={proj.id}
              onClick={() => handleSelect(proj)}
              className="flex items-center justify-between gap-2 p-2 text-xs cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-foreground">{proj.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {proj.client} • {proj.detectedCommitments} commitments
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <RiskBadge level={proj.riskLevel} showIcon={false} />
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/projects')}
          className="text-xs text-primary font-medium p-2 cursor-pointer"
        >
          View All Projects →
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
