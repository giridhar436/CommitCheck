import React from 'react'
import {
  ShieldAlert,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { RiskBadge } from '@/components/ui/risk-badge'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { CopyButton } from '@/components/copy-button'
import { StatusButton } from '@/components/status-button'
import { IconSwap, IconSwapItem } from '@/components/icon-swap'
import { LineNav } from '@/components/line-nav'
import { GlowCardGrid } from '@/components/glow-card-grid'
import { ScrollFadeEffect } from '@/components/scroll-fade-effect'
import { ActivityTimeline } from '@/components/activity/activity-timeline'

export function PhaseOneFoundationPage() {
  const [activeNav, setActiveNav] = React.useState('#tokens')
  const [swapped, setSwapped] = React.useState(false)

  const navItems = [
    { title: 'Design Tokens', href: '#tokens' },
    { title: 'Badges & States', href: '#badges' },
    { title: '@ncdai Components', href: '#ncdai' },
    { title: 'Architecture & Types', href: '#architecture' },
  ]

  const timescaleItems = [
    {
      id: '1',
      timestamp: '10:32 AM',
      title: 'Sprint 3 Meeting Analyzed',
      description: 'Ingested 4-person transcript for ABC E-Commerce.',
      badge: 'authorized',
    },
    {
      id: '2',
      timestamp: '10:33 AM',
      title: 'Google Login Commitment Detected',
      description: 'Rahul Mehta: "Sure, I\'ll add it by Friday."',
      badge: 'needs_review',
    },
    {
      id: '3',
      timestamp: '10:33 AM',
      title: 'Scope Mismatch Flagged',
      description: 'Google OAuth not in approved SOW Section 3.1.',
      badge: 'unauthorized',
    },
    {
      id: '4',
      timestamp: '10:35 AM',
      title: 'Change Request CR-3B7F21 Created',
      description: '18h engineering estimate submitted for client approval.',
      badge: 'pending_approval',
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-foreground">
                CommitCheck
              </span>
              <span className="ml-2 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Phase 1 Foundation
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Foundation Hero Intro */}
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Design System & Engineering Foundation
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Complete Phase 1 foundation for CommitCheck: clean token architecture,
            Tailwind v4 theme variables, type definitions, service layers, and verified
            Chanhdai / @ncdai component primitives.
          </p>
        </div>

        {/* Line Nav Navigation */}
        <div className="mb-8 border-b border-border/60">
          <LineNav
            items={navItems}
            activeHref={activeNav}
            onItemClick={(item, e) => {
              e.preventDefault()
              setActiveNav(item.href)
            }}
          />
        </div>

        {/* Section 1: Design Tokens */}
        {activeNav === '#tokens' && (
          <div className="space-y-8 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Semantic Risk System</CardTitle>
                <CardDescription className="text-xs">
                  Domain-specific color scales for high-risk scope creep, medium warnings, and approved baselines.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      HIGH RISK
                    </span>
                    <RiskBadge level="high" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Unapproved commitment, scope conflict, or missing change request.
                  </p>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      MEDIUM RISK
                    </span>
                    <RiskBadge level="medium" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ambiguous commitment, timeline tension, or pending authorization.
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      LOW / AUTHORIZED
                    </span>
                    <RiskBadge level="low" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Verified match in approved SOW or fully signed change request.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Typography & Information Density</CardTitle>
                <CardDescription className="text-xs">
                  Configured with Inter, tabular numbers, clear visual hierarchy, and subtle spacing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="text-xs text-muted-foreground font-mono">Example Commitment ID & Action</div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        CC-8F42A1
                      </span>
                      <CopyButton text="CC-8F42A1" variant="ghost" size="icon" />
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status="needs_review" />
                      <RiskBadge level="high" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-foreground font-medium">
                    "Sure, I'll add Google Login by Friday."
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rahul Mehta committed to Acme Corp during Sprint 3 Check-in.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 2: Badges & States */}
        {activeNav === '#badges' && (
          <div className="space-y-8 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Status & Workflow Badges</CardTitle>
                <CardDescription className="text-xs">
                  Every status type defined in the CommitCheck PRD with subtle accents and accessible contrast.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Commitment Statuses
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status="needs_review" />
                    <StatusBadge status="authorized" />
                    <StatusBadge status="unauthorized" />
                    <StatusBadge status="change_request_created" />
                    <StatusBadge status="dismissed" />
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Change Request Statuses
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status="draft" />
                    <StatusBadge status="pending_approval" />
                    <StatusBadge status="approved" />
                    <StatusBadge status="rejected" />
                    <StatusBadge status="implemented" />
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Risk Badges
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <RiskBadge level="high" />
                    <RiskBadge level="medium" />
                    <RiskBadge level="low" />
                    <RiskBadge level="none" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Loading State</CardTitle>
                </CardHeader>
                <CardContent>
                  <LoadingState message="Checking approved SOW scope..." size="sm" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Empty State</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={FolderOpen}
                    title="No commitments found"
                    description="Upload a meeting transcript to extract commitments."
                    actionLabel="Add Scope"
                    onAction={() => {}}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Error State</CardTitle>
                </CardHeader>
                <CardContent>
                  <ErrorState
                    title="Analysis Failed"
                    message="Failed to contact analysis worker. Please retry."
                    onRetry={() => {}}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Section 3: @ncdai Components */}
        {activeNav === '#ncdai' && (
          <div className="space-y-8 animate-fade-in">
            {/* Status Button & Icon Swap & Copy Button */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Status Button, Icon Swap & Copy Button
                </CardTitle>
                <CardDescription className="text-xs">
                  Interactive components installed from chanhdai.com/components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Status Button (Animated Async)</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusButton
                      onClick={async () => {
                        await new Promise((res) => setTimeout(res, 900))
                      }}
                      successLabel="Approved"
                      className="text-xs"
                    >
                      Approve Change Request
                    </StatusButton>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Icon Swap</h4>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSwapped((p) => !p)}
                      className="inline-flex items-center gap-2 text-xs"
                    >
                      <IconSwap>
                        <IconSwapItem key={swapped ? 'checked' : 'arrow'}>
                          {swapped ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </IconSwapItem>
                      </IconSwap>
                      <span>{swapped ? 'Marked Authorized' : 'Authorize Commitment'}</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Copy Button</h4>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 font-mono text-xs">
                    <span>CR-3B7F21</span>
                    <CopyButton text="CR-3B7F21" variant="ghost" size="icon" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timescale */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Timescale (Audit & Activity)</CardTitle>
                <CardDescription className="text-xs">
                  Audit timeline from meeting ingestion to client approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityTimeline items={timescaleItems} />
              </CardContent>
            </Card>

            {/* Scroll Fade Effect */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Scroll Fade Effect</CardTitle>
                <CardDescription className="text-xs">
                  Smooth content fade for long meeting transcripts and evidence blocks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollFadeEffect className="h-40 rounded-md border bg-muted/10 p-4">
                  <div className="space-y-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      Marcus Vance (09:14): "The checkout flow looks solid, but we're worried users will drop off if they have to create a brand new password during checkout. Can we also add Google Login?"
                    </p>
                    <p className="font-semibold text-foreground">
                      Rahul Mehta (09:15): "Sure, I'll add it by Friday. It shouldn't take more than a couple of days to wire up the OAuth callbacks."
                    </p>
                    <p>
                      Sarah Chen (09:16): "That would be huge for conversion. Let's make sure it's on staging by Thursday evening if possible."
                    </p>
                    <p>
                      Rahul Mehta (09:17): "Understood, I'll prioritize that right after the webhook testing."
                    </p>
                    <p>
                      Marcus Vance (09:18): "Also what about multi-currency pricing for EUR and GBP?"
                    </p>
                    <p>
                      Rahul Mehta (09:19): "We can easily flip the switch for multi-currency pricing before sprint close."
                    </p>
                  </div>
                </ScrollFadeEffect>
              </CardContent>
            </Card>

            {/* Glow Card Grid */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Glow Card Grid Preview</h3>
              <GlowCardGrid className="grid gap-4 sm:grid-cols-3">
                <Card className="relative overflow-hidden">
                  <CardHeader>
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="mt-2 text-sm font-semibold">1. Detect Commitments</CardTitle>
                    <CardDescription className="text-xs">
                      Extract verbal promises and deadlines directly from meeting notes.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card className="relative overflow-hidden">
                  <CardHeader>
                    <Layers className="h-5 w-5 text-primary" />
                    <CardTitle className="mt-2 text-sm font-semibold">2. Verify Scope</CardTitle>
                    <CardDescription className="text-xs">
                      Compare commitments against signed contracts and SOW requirements.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card className="relative overflow-hidden">
                  <CardHeader>
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    <CardTitle className="mt-2 text-sm font-semibold">3. Prevent Creep</CardTitle>
                    <CardDescription className="text-xs">
                      Convert unauthorized promises into structured, priced change requests.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </GlowCardGrid>
            </div>
          </div>
        )}

        {/* Section 4: Architecture & Types */}
        {activeNav === '#architecture' && (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Architecture & NestJS Backend Boundary</CardTitle>
                <CardDescription className="text-xs">
                  Clean service abstraction layer ready for NestJS backend connection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <span className="font-mono text-xs font-semibold text-primary">authService</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      login, register, forgotPassword, profile abstraction
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <span className="font-mono text-xs font-semibold text-primary">projectService</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      CRUD projects, risk aggregation, metrics
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <span className="font-mono text-xs font-semibold text-primary">meetingService</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      meeting analysis pipeline (extract → scope → auth → risk)
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <span className="font-mono text-xs font-semibold text-primary">commitmentService</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      commitments table, review, evidence mapping, authorization status
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <span className="font-mono text-xs font-semibold text-primary">changeRequestService</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      structured CR lifecycle (draft → pending → approved / rejected)
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <span className="font-mono text-xs font-semibold text-primary">scopeService & documentService</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      SOW requirements management & document attachments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
