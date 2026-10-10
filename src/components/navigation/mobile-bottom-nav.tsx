import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Video,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileBottomNavProps {
  onOpenDrawer: () => void
}

export function MobileBottomNav({ onOpenDrawer }: MobileBottomNavProps) {
  const location = useLocation()

  const projectMatch = location.pathname.match(/\/projects\/([^/]+)/)
  const currentProjectId = projectMatch ? projectMatch[1] : 'proj-abc-ecommerce'

  const items = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      isActive: location.pathname === '/dashboard',
    },
    {
      id: 'projects',
      label: 'Projects',
      href: `/projects/${currentProjectId}`,
      icon: FolderKanban,
      isActive:
        location.pathname === '/projects' ||
        location.pathname === `/projects/${currentProjectId}`,
    },
    {
      id: 'commitments',
      label: 'Commitments',
      href: `/projects/${currentProjectId}/commitments`,
      icon: ClipboardCheck,
      badge: '2',
      badgeClass: 'bg-red-500 text-white font-bold',
      isActive: location.pathname.includes('/commitments'),
    },
    {
      id: 'meetings',
      label: 'Meetings',
      href: `/projects/${currentProjectId}/meetings`,
      icon: Video,
      isActive: location.pathname.includes('/meetings'),
    },
  ]

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 block md:hidden border-t border-border/80 bg-background/95 backdrop-blur-md px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px] min-h-[48px] select-none',
                item.isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground active:scale-95',
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform duration-150',
                    item.isActive && 'scale-110 text-primary',
                  )}
                  strokeWidth={1.8}
                />
                {item.badge && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] leading-none shadow-xs',
                      item.badgeClass,
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
              {item.isActive && (
                <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}

        {/* More / Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-muted-foreground hover:text-foreground active:scale-95 transition-all min-w-[56px] min-h-[48px] cursor-pointer select-none"
          aria-label="Open full navigation menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.8} />
          <span className="text-[10px] mt-1 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  )
}
