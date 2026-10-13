import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthLayout } from '@/layouts/AuthLayout'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, authConfigured } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.')
      return
    }

    try {
      await login(email, password)
      toast.success('Welcome back to CommitCheck!')
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.'
      setError(msg)
    }
  }

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Access your active client projects, scope audits, and commitments."
    >
      {!authConfigured && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed"
        >
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            Authentication not configured
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Set <code className="rounded bg-muted px-1 py-0.5">VITE_SUPABASE_URL</code> and{' '}
            <code className="rounded bg-muted px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code> in your
            environment, then restart the dev server. Sign-in is disabled until then.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-foreground">
            Work Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@agency.com"
            autoComplete="email"
            required
            disabled={!authConfigured}
            className="text-xs h-9"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-semibold text-foreground">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              disabled={!authConfigured}
              className="text-xs h-9 pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !authConfigured}
          className="w-full text-xs h-9 font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-foreground hover:underline">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  )
}
