import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, CircleCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col lg:flex-row selection:bg-primary selection:text-primary-foreground">
      {/* Left Column: Brand & Value Narrative (Visible on Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-border/80 bg-muted/30 p-12 lg:flex">
        {/* Top: Logo */}
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShieldAlert className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              CommitCheck
            </span>
          </Link>
        </div>

        {/* Center: Hero Value Proposition */}
        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Scope Verification for Client Work
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            "Make sure what was promised to the client is actually approved before it becomes work."
          </h2>

          <div className="space-y-3 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
              <span>Detect verbal commitments from client meeting notes</span>
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
              <span>Cross-reference SOW clauses and contract deliverables</span>
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
              <span>Convert unauthorized scope creep into billable change orders</span>
            </div>
          </div>
        </div>

        {/* Bottom: Agency Quote & Security Callout */}
        <div className="rounded-lg border border-border/80 bg-background/80 p-5 shadow-xs">
          <p className="text-xs italic leading-relaxed text-foreground">
            "CommitCheck caught a $3,500 unapproved third-party API integration Rahul had casually promised during a Monday sync. We turned it into an approved change request before a single ticket was filed."
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Sarah Chen</span>
            <span>VP of Delivery, PixelForge</span>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Form Screen */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Top Utility Bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
          <ThemeToggle />
        </div>

        {/* Form Center Wrapper */}
        <div className="mx-auto w-full max-w-sm py-8 sm:py-12">
          {/* Mobile Logo Mark */}
          <div className="mb-6 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                CommitCheck
              </span>
            </Link>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>

          <div className="mt-6">{children}</div>
        </div>

        {/* Bottom Security Assurance */}
        <div className="text-center text-[11px] text-muted-foreground">
          <p>
            Secure project verification layer. Zero background surveillance.
          </p>
        </div>
      </div>
    </div>
  )
}
