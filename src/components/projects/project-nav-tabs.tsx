import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileCheck2,
  Files,
  Video,
  ClipboardCheck,
  FilePenLine,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProjectNavTabs({ projectId }: { projectId: string }) {
  const location = useLocation()

  const tabs = [
    {
      title: 'Overview',
      href: `/projects/${projectId}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: 'Approved Scope',
      href: `/projects/${projectId}/scope`,
      icon: FileCheck2,
      badge: '5',
    },
    {
      title: 'Scope Documents',
      href: `/projects/${projectId}/documents`,
      icon: Files,
      badge: '3',
    },
    {
      title: 'Meeting Analysis',
      href: `/projects/${projectId}/meetings`,
      icon: Video,
      badge: undefined,
    },
    {
      title: 'Commitments',
      href: `/projects/${projectId}/commitments`,
      icon: ClipboardCheck,
      badge: '2 High Risk',
      badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold',
    },
    {
      title: 'Change Requests',
      href: `/projects/${projectId}/change-requests`,
      icon: FilePenLine,
      badge: '1',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Activity & Audit',
      href: `/projects/${projectId}/activity`,
      icon: Activity,
    },
  ]

  const isTabActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href
    return location.pathname.startsWith(href)
  }

  return (
    <div className="border-b border-border/80 overflow-x-auto no-scrollbar">
      <nav className="flex space-x-1 sm:space-x-2 py-1 min-w-max">
        {tabs.map((tab) => {
          const active = isTabActive(tab.href, tab.exact)
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'group flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all relative',
                active
                  ? 'bg-muted text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
                strokeWidth={1.8}
              />
              <span>{tab.title}</span>
              {tab.badge && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-medium',
                    tab.badgeClass || 'bg-muted-foreground/15 text-muted-foreground',
                  )}
                >
                  {tab.badge}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
