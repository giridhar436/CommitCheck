import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { LoadingState } from '@/components/ui/loading-state'
import { useAuth } from '@/hooks/useAuth'

/**
 * Gate for the authenticated shell. UI-only convenience: the backend
 * re-verifies every request's token and role, so this never "secures"
 * anything by itself — it just keeps unauthenticated users out of the
 * app shell and restores the session before first render.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, authConfigured } = useAuth()
  const location = useLocation()

  if (!authConfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <CircleAlert className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-sm font-semibold">Authentication is not configured</h1>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Set <code className="rounded bg-muted px-1 py-0.5">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-muted px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code> in the
          frontend environment to enable sign-in. The anon key is safe for the browser —
          service-role keys must never be placed in frontend code.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingState message="Restoring session…" className="min-h-screen justify-center" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
