import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

const routeNameMap: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  scope: 'Approved Scope',
  documents: 'Documents',
  meetings: 'Meeting Analysis',
  commitments: 'Commitments',
  'change-requests': 'Change Requests',
  settings: 'Settings',
}

export function Breadcrumbs({ items }: { items?: BreadcrumbItem[] }) {
  const location = useLocation()

  if (items && items.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center text-xs text-muted-foreground">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <Link
              to="/dashboard"
              className="flex items-center hover:text-foreground transition-colors"
              aria-label="Home"
            >
              <Home className="h-3.5 w-3.5" strokeWidth={1.8} />
            </Link>
          </li>
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li key={index} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" strokeWidth={1.8} />
                {isLast || !item.href ? (
                  <span className="font-semibold text-foreground truncate max-w-[200px]">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="hover:text-foreground transition-colors truncate max-w-[160px]"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  }

  // Automatic crumbs from current pathname
  const segments = location.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-muted-foreground min-w-0">
      <ol className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
        <li className="shrink-0">
          <Link
            to="/dashboard"
            className="flex items-center hover:text-foreground transition-colors"
            aria-label="Home"
          >
            <Home className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Link>
        </li>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          const isSecondToLast = index === segments.length - 2
          const href = '/' + segments.slice(0, index + 1).join('/')
          const label = routeNameMap[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

          return (
            <li
              key={href}
              className={cn(
                'flex items-center gap-1.5 min-w-0 shrink',
                !isLast && !isSecondToLast && 'hidden md:flex',
              )}
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" strokeWidth={1.8} />
              {isLast ? (
                <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[200px]">
                  {label}
                </span>
              ) : (
                <Link
                  to={href}
                  className="hover:text-foreground transition-colors truncate max-w-[90px] sm:max-w-[160px]"
                >
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
