import { Menu, Search, ShieldCheck } from 'lucide-react'
import { Breadcrumbs } from './breadcrumbs'
import { NotificationsPopover } from './notifications-popover'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { UserMenu } from './user-menu'

interface TopbarProps {
  onOpenMobileNav: () => void
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md sm:px-6">
      {/* Left Area: Mobile Trigger & Dynamic Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden cursor-pointer shrink-0"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-4 w-4" strokeWidth={1.8} />
        </button>

        <div className="min-w-0 overflow-hidden">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right Area: Search, Verification Status, Notifications, Theme & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Search Shortcut Display */}
        <div className="relative hidden md:block">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>Search commitments…</span>
            <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Protection Engine Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span>Scope Protected</span>
        </div>

        {/* Notifications */}
        <NotificationsPopover />

        {/* Theme Switcher */}
        <ThemeToggle />

        {/* User Menu (Visible on mobile when sidebar is hidden) */}
        <div className="md:hidden">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
