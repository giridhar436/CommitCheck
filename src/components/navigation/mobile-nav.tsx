import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  X,
  ShieldAlert,
  ClipboardCheck,
  LayoutDashboard,
  FolderKanban,
  FilePenLine,
  Video,
  FileCheck2,
  Files,
  Activity,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectSwitcher } from './project-switcher'
import { UserMenu } from './user-menu'
import { useAuth } from '@/hooks/useAuth'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const location = useLocation()
  const { user } = useAuth()

  // Close drawer automatically when route changes
  useEffect(() => {
    onClose()
  }, [location.pathname])

  if (!open) return null

  const projectMatch = location.pathname.match(/\/projects\/([^/]+)/)
  const currentProjectId = projectMatch ? projectMatch[1] : null
  const projectHref = (tab: string) =>
    currentProjectId ? `/projects/${currentProjectId}/${tab}` : `/${tab}`

  const links = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'All Projects', href: '/projects', icon: FolderKanban },
    {
      title: 'Commitments',
      href: projectHref('commitments'),
      icon: ClipboardCheck,
    },
    {
      title: 'Change Requests',
      href: projectHref('change-requests'),
      icon: FilePenLine,
    },
    {
      title: 'Meeting Analysis',
      href: projectHref('meetings'),
      icon: Video,
    },
    {
      title: 'Approved Scope',
      href: projectHref('scope'),
      icon: FileCheck2,
    },
    {
      title: 'Scope Documents',
      href: projectHref('documents'),
      icon: Files,
    },
    {
      title: 'Activity & Audit',
      href: projectHref('activity'),
      icon: Activity,
    },
    { title: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard'
    if (href === '/projects') return location.pathname === '/projects'
    return location.pathname.startsWith(href)
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 flex w-72 flex-col border-r border-border/80 bg-sidebar text-sidebar-foreground shadow-xl animate-drawer-left">
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShieldAlert className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">
              CommitCheck
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Project Switcher */}
        <div className="border-b border-border/60 p-3">
          <ProjectSwitcher />
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {links.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={1.8} />
                  <span>{item.title}</span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Bottom User Area */}
        <div className="border-t border-border/60 p-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserMenu />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{user?.name ?? 'Rahul Mehta'}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user?.organization ?? 'PixelForge Studios'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
