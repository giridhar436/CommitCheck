import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, AuthState } from '@/types'
import { authService } from '@/services/auth'
import { apiClient } from '@/services/api/client'
import { supabase, isAuthConfigured } from '@/services/supabase'

interface AuthContextValue extends AuthState {
  /** True when Supabase Auth env vars are present; false shows a
   * configuration notice instead of a login form that can never succeed. */
  authConfigured: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, organization?: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = !!user

  const clearSession = useCallback(() => {
    apiClient.setToken(null)
    setUser(null)
  }, [])

  // ——— Session restore + token plumbing ———
  // The Supabase session is the single source of truth. On mount we push the
  // access token into the API client and re-validate it against the backend
  // (GET /auth/me); after that, auth state changes keep the token in sync.
  // There is deliberately no localStorage user persistence — a stale local
  // user must never enter the authenticated shell.
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }
    const client = supabase

    let cancelled = false

    const restore = async () => {
      try {
        const token = await authService.getAccessToken()
        if (token) apiClient.setToken(token)
        const profile = await authService.getProfile()
        if (!cancelled) setUser(profile)
      } catch {
        clearSession()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    restore()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (session) {
        apiClient.setToken(session.access_token)
        if (event === 'SIGNED_IN') {
          const email = session.user.email ?? ''
          const meta = session.user.user_metadata
          setUser({
            id: session.user.id,
            email,
            name:
              (typeof meta?.name === 'string' && meta.name) ||
              email.split('@')[0] ||
              'User',
            organization:
              typeof meta?.organization === 'string' ? meta.organization : undefined,
            role: 'member',
            createdAt: session.user.created_at ?? new Date().toISOString(),
          })
        }
      } else {
        clearSession()
      }
    })

    // Global 401 handling: if the backend rejects the credential (expired or
    // revoked token), drop the session. Backend authorization stays
    // authoritative — RequireAuth then redirects to /login.
    const off = apiClient.addResponseInterceptor({
      onResponse: () => {},
      onError: (error) => {
        if (error.isUnauthorized) {
          clearSession()
          client.auth.signOut().catch(() => {})
        }
      },
    })

    return () => {
      cancelled = true
      off()
      subscription.unsubscribe()
    }
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      await authService.login(email, password)
      // onAuthStateChange(SIGNED_IN) completes the state update.
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string, organization?: string) => {
      setIsLoading(true)
      try {
        await authService.register(name, email, password, organization)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true)
    try {
      await authService.forgotPassword(email)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    authService.logout().catch(() => {})
  }, [clearSession])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        authConfigured: isAuthConfigured,
        login,
        register,
        forgotPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
