import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, MailCheck, ArrowLeft, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthLayout } from '@/layouts/AuthLayout'
import { useAuth } from '@/hooks/useAuth'

export function ForgotPasswordPage() {
  const { forgotPassword, isLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please provide your work email address.')
      return
    }

    try {
      await forgotPassword(email)
      setSubmitted(true)
      toast.success('Password reset instructions sent to your email.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link.'
      setError(msg)
    }
  }

  const handleResend = async () => {
    try {
      await forgotPassword(email)
      toast.success('Reset email resent!')
    } catch {
      toast.error('Failed to resend. Please try again later.')
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your verified work email and we'll send a password recovery link."
    >
      {submitted ? (
        <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-5 text-center animate-fade-in">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <MailCheck className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Check your inbox</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We have sent password recovery instructions to{' '}
              <strong className="text-foreground">{email}</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? 'Sending…' : "Didn't receive email? Click to resend"}
            </Button>

            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/login" className="inline-flex items-center gap-1.5">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="text-xs font-semibold text-foreground">
                Work Email
              </label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.com"
                autoComplete="email"
                required
                className="text-xs h-9"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full text-xs h-9 font-semibold">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Sending instructions…
                </>
              ) : (
                'Send Recovery Link'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Remembered your credentials?{' '}
            <Link to="/login" className="font-semibold text-foreground hover:underline">
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  )
}
