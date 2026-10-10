import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  FilePenLine,
  Video,
  FileCheck2,
  Files,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectSwitcher } from './project-switcher'
import { UserMenu } from './user-menu'

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  className?: string
}

export function Sidebar({ collapsed, onToggleCollapse, className }: SidebarProps) {
  const location = useLocation()

  // Match active project ID from route if present, or fallback to default primary demo project
  const projectMatch = location.pathname.match(/\/projects\/([^/]+)/)
  const currentProjectId = projectMatch ? projectMatch[1] : 'proj-abc-ecommerce'

  const mainNav = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      title: 'All Projects',
      href: '/projects',
      icon: FolderKanban,
      badge: '4',
    },
  ]

  const projectNav = [
    {
      title: 'Commitments',
      href: `/projects/${currentProjectId}/commitments`,
      icon: ClipboardCheck,
      badge: '2',
      badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold',
    },
    {
      title: 'Change Requests',
      href: `/projects/${currentProjectId}/change-requests`,
      icon: FilePenLine,
      badge: '1',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Meeting Analysis',
      href: `/projects/${currentProjectId}/meetings`,
      icon: Video,
      badge: undefined,
    },
    {
      title: 'Approved Scope',
      href: `/projects/${currentProjectId}/scope`,
      icon: FileCheck2,
      badge: '5',
    },
    {
      title: 'Scope Documents',
      href: `/projects/${currentProjectId}/documents`,
      icon: Files,
      badge: undefined,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard'
    if (href === '/projects') return location.pathname === '/projects'
    return location.pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border/80 bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Sidebar Header with Brand */}
      <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShieldAlert className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground leading-none">
                CommitCheck
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                Project Protection
              </span>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link to="/dashboard" className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldAlert className="h-4 w-4" strokeWidth={1.8} />
          </Link>
        )}

        {/* Collapse/Expand toggle button — always visible */}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Expand button — always visible when collapsed */}
      {collapsed && (
        <div className="flex justify-center border-b border-border/60 py-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* Project Switcher section */}
      {!collapsed && (
        <div className="border-b border-border/60 p-3">
          <ProjectSwitcher />
        </div>
      )}

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Section */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Overview
            </div>
          )}
          {mainNav.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-150 relative',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.title : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary transition-all duration-200" />
                )}
                <Icon className={cn('h-4 w-4 shrink-0 transition-colors duration-150', active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground')} strokeWidth={1.8} />
                {!collapsed && <span className="truncate flex-1 transition-opacity duration-200">{item.title}</span>}
                {!collapsed && item.badge && (
                  <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Active Project Section */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Project Scope & Audit
            </div>
          )}
          {projectNav.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-150 relative',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.title : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary transition-all duration-200" />
                )}
                <Icon className={cn('h-4 w-4 shrink-0 transition-colors duration-150', active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground')} strokeWidth={1.8} />
                {!collapsed && <span className="truncate flex-1 transition-opacity duration-200">{item.title}</span>}
                {!collapsed && item.badge && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-medium',
                      item.badgeClass || 'bg-muted text-muted-foreground',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-border/60 p-3 space-y-2">
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors duration-150',
            collapsed && 'justify-center px-0',
            isActive('/settings') && 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold',
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          {!collapsed && <span className="truncate transition-opacity duration-200">Settings</span>}
        </Link>

        {/* User Card */}
        <div
          className={cn(
            'flex items-center justify-between rounded-lg border border-border/60 bg-background/50 p-2',
            collapsed && 'justify-center border-0 bg-transparent p-0',
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <UserMenu />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">Rahul Mehta</div>
                <div className="text-[10px] text-muted-foreground truncate">PixelForge Studios</div>
              </div>
            </div>
          )}
          {collapsed && <UserMenu />}
        </div>
      </div>
    </aside>
  )
}
