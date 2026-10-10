import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Play, CircleAlert, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthLayout } from '@/layouts/AuthLayout'
import { useAuth } from '@/hooks/useAuth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please complete all required fields.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!agreed) {
      setError('You must agree to the Terms of Service.')
      return
    }

    try {
      await register(name, email, password, organization)
      toast.success('Account created! Welcome to CommitCheck.')
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setError(msg)
    }
  }

  // Demo shortcut for instant registration
  const handleFastFill = () => {
    setName('Rahul Mehta')
    setEmail('rahul@pixelforge.io')
    setOrganization('PixelForge Studios')
    setPassword('DemoPass2025!')
    setAgreed(true)
    setError(null)
  }

  const isPasswordLong = password.length >= 8
  const hasNumberOrSymbol = /[0-9!@#$%^&*]/.test(password)

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start protecting client projects and preventing unbilled scope creep."
    >
      {/* Demo Fast Fill Banner */}
      <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary shrink-0" strokeWidth={1.8} />
            <span className="font-semibold text-foreground">Demo Mode</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFastFill}
            className="h-7 px-2.5 text-[11px] font-medium"
          >
            Auto-Fill Agency
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-normal">
          Fills pre-configured details for PixelForge Studios.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-semibold text-foreground">
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Mehta"
            autoComplete="name"
            required
            className="text-xs h-9"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-email" className="text-xs font-semibold text-foreground">
            Work Email
          </label>
          <Input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rahul@pixelforge.io"
            autoComplete="email"
            required
            className="text-xs h-9"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="org" className="text-xs font-semibold text-foreground">
            Agency / Organization Name
          </label>
          <Input
            id="org"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="PixelForge Studios"
            className="text-xs h-9"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-password" className="text-xs font-semibold text-foreground">
            Password
          </label>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
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

          {/* Password checklist */}
          {password.length > 0 && (
            <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
              <span className={`flex items-center gap-1 ${isPasswordLong ? 'text-emerald-500' : ''}`}>
                <Check className="h-3 w-3" /> 8+ characters
              </span>
              <span className={`flex items-center gap-1 ${hasNumberOrSymbol ? 'text-emerald-500' : ''}`}>
                <Check className="h-3 w-3" /> Number or symbol
              </span>
            </div>
          )}
        </div>

        {/* Agreement checkbox */}
        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="agreed"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
          />
          <label htmlFor="agreed" className="text-[11px] text-muted-foreground leading-snug cursor-pointer">
            I agree to the Terms of Service, Privacy Policy, and scope verification guidelines.
          </label>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full text-xs h-9 font-semibold mt-2">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Creating account…
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
