import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/navigation/sidebar'
import { Topbar } from '@/components/navigation/topbar'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav'
import { HackathonDemoBar } from '@/components/demo/hackathon-demo-bar'
import { PwaInstallPrompt } from '@/components/pwa/pwa-install-prompt'
import { useAuth } from '@/hooks/useAuth'

const COLLAPSED_STORAGE_KEY = 'commitcheck-sidebar-collapsed'

export function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
  })

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next))
      return next
    })
  }

  // If visiting an unauthenticated route while in dashboard or vice versa, handle smoothly
  useEffect(() => {
    // If user is accessing protected routes and no user exists, we allow demo browsing with demo defaults
    if (!user && location.pathname.startsWith('/dashboard/never')) {
      navigate('/login')
    }
  }, [user, location.pathname, navigate])

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* Desktop Persistent Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        className="hidden md:flex shrink-0"
      />

      {/* Mobile Off-Canvas Drawer */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
          <div key={location.pathname} className="animate-page-enter min-w-0 flex-1">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Dock Bar */}
      <MobileBottomNav onOpenDrawer={() => setMobileNavOpen(true)} />

      {/* Interactive Walkthrough Demo Navigator */}
      <HackathonDemoBar />

      {/* PWA Install Prompt — subtle, once per session */}
      <PwaInstallPrompt />
    </div>
  )
}
