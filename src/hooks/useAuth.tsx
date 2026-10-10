import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, AuthState } from '@/types'
import { authService } from '@/services/auth'

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, organization?: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'commitcheck-token'
const USER_KEY = 'commitcheck-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      try {
        return JSON.parse(stored) as User
      } catch {
        return null
      }
    }
    return null
  })

  const [isLoading, setIsLoading] = useState(false)
  const isAuthenticated = !!user

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { user: loggedInUser, token } = await authService.login(email, password)
      setUser(loggedInUser)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string, organization?: string) => {
      setIsLoading(true)
      try {
        const { user: registeredUser, token } = await authService.register(name, email, password)
        if (organization) {
          registeredUser.organization = organization
        }
        setUser(registeredUser)
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(registeredUser))
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
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    authService.logout().catch(() => {})
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        forgotPassword,
        logout,
        setUser,
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
