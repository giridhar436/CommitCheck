import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  ArrowRight,
  CircleCheck,
  TriangleAlert,
  FileText,
  Search,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap,
  TrendingDown,
  Lock,
  X,
  FilePenLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RiskBadge } from '@/components/ui/risk-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { CopyButton } from '@/components/copy-button'
import { DotGridSpotlight } from '@/components/dot-grid-spotlight'
import { GlowCardGrid } from '@/components/glow-card-grid'
import { ScrollFadeEffect } from '@/components/scroll-fade-effect'

export function LandingPage() {
  const [demoTab, setDemoTab] = useState<'comparison' | 'evidence' | 'timeline'>('comparison')

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* ——————————————————————————————————————————————————
       * Navigation Header
       * —————————————————————————————————————————————————— */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-foreground">
                CommitCheck
              </span>
              <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                BETA
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollToSection('problem')}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              The Problem
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('why-us')}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              Why CommitCheck
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              Product Preview
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="hidden text-xs sm:inline-flex">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-xs font-medium shadow-xs">
              <Link to="/register">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ——————————————————————————————————————————————————
       * Hero Section with Dot Grid Spotlight
       * —————————————————————————————————————————————————— */}
      <section className="relative overflow-hidden border-b border-border/60 py-20 sm:py-28 lg:py-32">
        {/* Subtle Interactive Dot Grid Spotlight */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <DotGridSpotlight
            spacing={16}
            baseRadius={1}
            activeRadius={2.5}
            interactionRadius={160}
            dotColor="rgba(128, 128, 128, 0.12)"
            activeDotColor="rgba(128, 128, 128, 0.35)"
            className="pointer-events-auto h-full w-full"
          />
        </div>

        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          {/* Announce Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-xs">
            <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Scope Creep Protection Layer for Software Teams</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Hero Core Statement */}
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.12]">
            Make sure what was promised to the client is actually{' '}
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
              approved
            </span>{' '}
            before it becomes work.
          </h1>

          {/* Supporting Text */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            CommitCheck detects commitments from user-authorized client meeting summaries,
            compares them against your approved SOW scope, and flags potential scope creep
            before your team starts building.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button size="lg" asChild className="h-11 px-6 text-sm font-semibold shadow-xs">
              <Link to="/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('problem')}
              className="h-11 px-6 text-sm font-medium border-border/80"
            >
              See How It Works
            </Button>
          </div>

          {/* Target Audience Bar */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.8} />
              Freelancers & Consultants
            </span>
            <span className="flex items-center gap-1.5">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.8} />
              Software Agencies & Dev Shops
            </span>
            <span className="flex items-center gap-1.5">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.8} />
              Delivery & Project Managers
            </span>
            <span className="flex items-center gap-1.5">
              <CircleCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.8} />
              Founders Managing Client Work
            </span>
          </div>
        </div>
      </section>

      {/* ——————————————————————————————————————————————————
       * Problem Section: "Client conversations move faster than contracts"
       * —————————————————————————————————————————————————— */}
      <section id="problem" className="border-b border-border/60 py-20 sm:py-24 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">
              The Scope Creep Trap
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              "Client conversations move faster than contracts."
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A quick client question in a standup turns into a promise. That promise becomes
              unapproved engineering work. By Friday, hours were burned that no one can bill for.
            </p>
          </div>

          {/* Before / After Concrete Example Card */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* The Casual Meeting Exchange */}
            <Card className="border-border/80 bg-card shadow-xs">
              <div className="border-b border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    What Happened in the Call
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">10:14 AM</span>
                </div>
              </div>
              <CardContent className="space-y-4 p-5 text-sm">
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3.5">
                  <p className="text-xs font-bold text-foreground">Client (Marcus):</p>
                  <p className="mt-1 text-xs text-foreground/90 italic">
                    "Can we also add Google Login for the checkout launch?"
                  </p>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/40 p-3.5">
                  <p className="text-xs font-bold text-foreground">Developer (Rahul):</p>
                  <p className="mt-1 text-xs text-foreground/90 italic">
                    "Sure, I'll add it by Friday."
                  </p>
                </div>

                <div className="pt-2 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">The Danger:</p>
                  <p className="mt-1 leading-relaxed">
                    Rahul intended to be helpful, but Google OAuth requires OAuth consent setup,
                    database user schema migration, and testing. It was never in the SOW.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CommitCheck Detection Result */}
            <Card className="border-red-500/30 bg-red-500/5 shadow-xs">
              <div className="border-b border-red-500/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    What CommitCheck Flags
                  </span>
                  <RiskBadge level="high" />
                </div>
              </div>
              <CardContent className="space-y-4 p-5 text-xs">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-400">
                      <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                    <div>
                      <span className="font-semibold text-foreground">Not in Approved Scope:</span>
                      <p className="text-muted-foreground">
                        SOW Section 3.1 strictly authorizes Email/Password authentication.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-400">
                      <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                    <div>
                      <span className="font-semibold text-foreground">No Authorization Found:</span>
                      <p className="text-muted-foreground">
                        No signed change request, email confirmation, or budget addendum exists.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-400">
                      <TriangleAlert className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                    <div>
                      <span className="font-semibold text-foreground">Unauthorized Work Risk:</span>
                      <p className="text-muted-foreground">
                        Estimated 18 hours of unbilled engineering effort before Friday.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-red-500/20 bg-background/80 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground">Action:</span>
                    <StatusBadge status="pending_approval" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generate Change Request CR-3B7F21 for client approval before work starts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verification Layer Architecture Diagram */}
          <div className="mx-auto mt-14 max-w-3xl rounded-xl border border-border/80 bg-card p-6 shadow-xs">
            <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              CommitCheck Position in the Delivery Pipeline
            </h3>
            <div className="mt-6 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:gap-2">
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-foreground">
                Client Communication
                <span className="block text-[10px] font-normal text-muted-foreground">Meetings & Calls</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0" />
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-foreground">
                Commitment
                <span className="block text-[10px] font-normal text-muted-foreground">Promises Detected</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0" />
              <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary ring-1 ring-primary/30">
                CommitCheck Layer
                <span className="block text-[10px] font-medium text-primary/80">Scope Verification</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0" />
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-foreground">
                Approved Work
                <span className="block text-[10px] font-normal text-muted-foreground">Protected Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——————————————————————————————————————————————————
       * How It Works (6-Stage Pipeline)
       * —————————————————————————————————————————————————— */}
      <section id="how-it-works" className="border-b border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">
              Systematic Protection
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              How CommitCheck Works
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A 6-step verification layer that catches promises before they turn into unauthorized pull requests.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Step 1 */}
            <Card className="relative overflow-hidden border-border/80 shadow-xs">
              <div className="absolute top-4 right-4 text-2xl font-bold text-muted-foreground/20 font-mono">
                01
              </div>
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  1. Add Approved Scope
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Upload your signed SOW, contract, or enter agreed feature requirements.
                  This establishes the baseline against which every future commitment is verified.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="relative overflow-hidden border-border/80 shadow-xs">
              <div className="absolute top-4 right-4 text-2xl font-bold text-muted-foreground/20 font-mono">
                02
              </div>
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  2. Submit Meeting Summary
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Paste the notes, summary, or transcript from your client call.
                  No recording bots or continuous background surveillance — you control exactly what is analyzed.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="relative overflow-hidden border-border/80 shadow-xs">
              <div className="absolute top-4 right-4 text-2xl font-bold text-muted-foreground/20 font-mono">
                03
              </div>
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  3. Detect Commitments
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  CommitCheck identifies who promised what, the specific deliverable,
                  and promised deadlines directly from verbal statements and meeting agreements.
                </p>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card className="relative overflow-hidden border-border/80 shadow-xs">
              <div className="absolute top-4 right-4 text-2xl font-bold text-muted-foreground/20 font-mono">
                04
              </div>
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  4. Verify Against Scope
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Each detected promise is cross-referenced with your approved scope clauses.
                  Matches are marked authorized; discrepancies are flagged immediately.
                </p>
              </CardContent>
            </Card>

            {/* Step 5 */}
            <Card className="relative overflow-hidden border-border/80 shadow-xs">
              <div className="absolute top-4 right-4 text-2xl font-bold text-muted-foreground/20 font-mono">
                05
              </div>
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <TriangleAlert className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  5. Review Unauthorized Work
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  High-risk commitments surface with exact verbatim evidence and rationale.
                  Review the conflict before developers schedule or pick up the ticket.
                </p>
              </CardContent>
            </Card>

            {/* Step 6 */}
            <Card className="relative overflow-hidden border-border/80 shadow-xs">
              <div className="absolute top-4 right-4 text-2xl font-bold text-muted-foreground/20 font-mono">
                06
              </div>
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FilePenLine className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  6. Create Change Request
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  With 1 click, convert flagged scope into a structured change request
                  with effort estimates, impact analysis, and formal client approval tracking.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ——————————————————————————————————————————————————
       * Why CommitCheck (Glow Card Grid Value Pillars)
       * —————————————————————————————————————————————————— */}
      <section id="why-us" className="border-b border-border/60 py-20 sm:py-24 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">
              Core Value Pillars
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Detect. Verify. Protect.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Three pillars designed to preserve agency margins and stop unbilled work.
            </p>
          </div>

          <div className="mt-14">
            <GlowCardGrid className="grid gap-6 sm:grid-cols-3">
              {/* Pillar 1: Detect */}
              <Card className="relative overflow-hidden border-border/80 bg-card p-6 shadow-xs">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">
                  Detect
                </h3>
                <p className="mt-1 text-xs font-semibold text-primary">
                  Understand what was promised.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Client conversations happen fast. Extract explicit commitments, deadlines,
                  and implied deliverables from meeting summaries before they get lost in Slack.
                </p>
                <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-2.5 text-[11px] text-muted-foreground font-mono">
                  "I'll have Google Login added by Friday"
                </div>
              </Card>

              {/* Pillar 2: Verify */}
              <Card className="relative overflow-hidden border-border/80 bg-card p-6 shadow-xs">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">
                  Verify
                </h3>
                <p className="mt-1 text-xs font-semibold text-primary">
                  Compare against approved scope.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Automatically compare commitments against approved SOW documents and contracts.
                  Eliminate subjective "he said / she said" scope arguments with clients.
                </p>
                <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-2.5 text-[11px] text-muted-foreground font-mono">
                  SOW 3.1: Email/Password Auth Only
                </div>
              </Card>

              {/* Pillar 3: Protect */}
              <Card className="relative overflow-hidden border-border/80 bg-card p-6 shadow-xs">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">
                  Protect
                </h3>
                <p className="mt-1 text-xs font-semibold text-primary">
                  Stop unauthorized work before implementation.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Catch unauthorized commitments before engineers spend sprints on them.
                  Turn scope creep into paid, client-approved change orders with full accountability.
                </p>
                <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-2.5 text-[11px] text-muted-foreground font-mono">
                  CR-3B7F21: 18h / $2,250 Scope Addendum
                </div>
              </Card>
            </GlowCardGrid>
          </div>
        </div>
      </section>

      {/* ——————————————————————————————————————————————————
       * Product Preview Sandbox: Live Interactive Inspection
       * —————————————————————————————————————————————————— */}
      <section id="demo" className="border-b border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">
              Live Product Inspection
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Explainability Over AI Black Boxes
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Never accept an arbitrary "87% confidence" score. CommitCheck provides concrete
              contract evidence, verbatim transcripts, and clear next actions for every item.
            </p>
          </div>

          {/* Interactive Inspection Card */}
          <div className="mx-auto mt-12 max-w-4xl rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
            {/* Header bar */}
            <div className="border-b border-border/60 bg-muted/40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-foreground">
                  Commitment ID: CC-8F42A1
                </span>
                <CopyButton text="CC-8F42A1" variant="ghost" size="icon" />
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="needs_review" />
                <RiskBadge level="high" />
              </div>
            </div>

            {/* Commitment Details Grid */}
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Add Google OAuth Login to authentication and checkout flow
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                  <span>Committed By: <strong className="text-foreground">Rahul Mehta (Tech Lead)</strong></span>
                  <span>Promised Deadline: <strong className="text-foreground">Friday, March 14</strong></span>
                  <span>Project: <strong className="text-foreground">ABC E-Commerce</strong></span>
                  <span>Client: <strong className="text-foreground">Acme Corp</strong></span>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex border-b border-border/60 gap-4 text-xs font-medium">
                <button
                  onClick={() => setDemoTab('comparison')}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    demoTab === 'comparison'
                      ? 'border-b-2 border-primary text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Scope Comparison
                </button>
                <button
                  onClick={() => setDemoTab('evidence')}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    demoTab === 'evidence'
                      ? 'border-b-2 border-primary text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Verbatim Meeting Evidence
                </button>
                <button
                  onClick={() => setDemoTab('timeline')}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    demoTab === 'timeline'
                      ? 'border-b-2 border-primary text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Audit Trail
                </button>
              </div>

              {/* Tab 1: Comparison */}
              {demoTab === 'comparison' && (
                <div className="grid gap-4 sm:grid-cols-2 animate-fade-in">
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Approved Scope Baseline
                    </span>
                    <h4 className="mt-2 text-xs font-semibold text-foreground">
                      SOW Section 3.1 — User Authentication
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      "System shall support email and password authentication with Argon2 hashing and transactional verification emails."
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Approved Contract Clause
                    </div>
                  </div>

                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                      Detected Commitment
                    </span>
                    <h4 className="mt-2 text-xs font-semibold text-foreground">
                      Google OAuth 2.0 Single Sign-On
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      "Client requested adding Google Login to decrease checkout friction before Friday launch demo."
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold">
                      <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.8} />
                      NOT FOUND IN APPROVED SCOPE
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Evidence with ScrollFadeEffect */}
              {demoTab === 'evidence' && (
                <div className="animate-fade-in">
                  <span className="text-xs font-semibold text-foreground">
                    Meeting Transcript Context (Sprint 3 Check-in):
                  </span>
                  <ScrollFadeEffect className="mt-2 h-44 rounded-lg border border-border/80 bg-muted/20 p-4">
                    <div className="space-y-3 font-mono text-xs text-muted-foreground">
                      <p>
                        <strong className="text-foreground">Marcus Vance (Client VP) [09:14]:</strong> "The checkout flow looks solid, but we're worried users will drop off if they have to create a brand new password during checkout. Can we also add Google Login?"
                      </p>
                      <p className="rounded bg-red-500/10 p-2 text-foreground font-semibold border-l-2 border-red-500">
                        <strong>Rahul Mehta (Tech Lead) [09:15]:</strong> "Sure, I'll add it by Friday. It shouldn't take more than a couple of days to wire up the OAuth callbacks."
                      </p>
                      <p>
                        <strong className="text-foreground">Sarah Chen (Acme PM) [09:16]:</strong> "That would be huge for conversion. Let's make sure it's on staging by Thursday evening if possible."
                      </p>
                      <p>
                        <strong className="text-foreground">Rahul Mehta (Tech Lead) [09:17]:</strong> "Understood, I'll prioritize that right after the webhook testing."
                      </p>
                    </div>
                  </ScrollFadeEffect>
                </div>
              )}

              {/* Tab 3: Timeline */}
              {demoTab === 'timeline' && (
                <div className="space-y-3 font-mono text-xs animate-fade-in">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">10:32 AM</span>
                    <span className="text-foreground font-medium">Sprint 3 Meeting ingested & analyzed</span>
                    <StatusBadge status="authorized" />
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">10:33 AM</span>
                    <span className="text-foreground font-medium">Commitment extracted: "Add Google Login by Friday"</span>
                    <StatusBadge status="needs_review" />
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">10:33 AM</span>
                    <span className="text-red-500 font-semibold">Cross-referenced SOW 3.1 — Scope Mismatch Found</span>
                    <RiskBadge level="high" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">10:35 AM</span>
                    <span className="text-foreground font-medium">Draft Change Request CR-3B7F21 generated</span>
                    <StatusBadge status="pending_approval" />
                  </div>
                </div>
              )}

              {/* Action Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Recommended Next Action:</h4>
                  <p className="text-xs text-muted-foreground">
                    Convert this commitment into a client-approved change order before development begins.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" asChild className="text-xs">
                    <Link to="/register">Create Change Request</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——————————————————————————————————————————————————
       * Social Proof & Agency Economics
       * —————————————————————————————————————————————————— */}
      <section className="border-b border-border/60 py-20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-primary">
              Agency Impact
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Built for teams who cannot afford unbilled hours
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/80 text-center p-6 shadow-xs">
              <TrendingDown className="mx-auto h-6 w-6 text-emerald-500" />
              <div className="mt-3 text-3xl font-bold tracking-tight text-foreground font-mono">
                14.8%
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Average scope creep eliminated per client engagement
              </p>
            </Card>

            <Card className="border-border/80 text-center p-6 shadow-xs">
              <Zap className="mx-auto h-6 w-6 text-primary" />
              <div className="mt-3 text-3xl font-bold tracking-tight text-foreground font-mono">
                Zero
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Unbilled "Friday promises" turning into unpaid sprint work
              </p>
            </Card>

            <Card className="border-border/80 text-center p-6 shadow-xs">
              <ShieldCheck className="mx-auto h-6 w-6 text-emerald-500" strokeWidth={1.8} />
              <div className="mt-3 text-3xl font-bold tracking-tight text-foreground font-mono">
                100%
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Contract clause traceability for every commitment
              </p>
            </Card>

            <Card className="border-border/80 text-center p-6 shadow-xs">
              <FileText className="mx-auto h-6 w-6 text-primary" />
              <div className="mt-3 text-3xl font-bold tracking-tight text-foreground font-mono">
                &lt; 60s
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                To turn an unapproved verbal promise into a priced change order
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ——————————————————————————————————————————————————
       * Bottom Call To Action
       * —————————————————————————————————————————————————— */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Stop building unapproved promises today.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Protect your team's velocity, avoid unbilled overtime, and preserve client trust
            with automatic commitment verification.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="h-11 px-8 text-sm font-semibold shadow-xs">
              <Link to="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 px-6 text-sm">
              <Link to="/login">Sign In to Dashboard</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No recording bots. No invasive background monitoring. Only what you authorize.
          </p>
        </div>
      </section>

      {/* ——————————————————————————————————————————————————
       * Footer
       * —————————————————————————————————————————————————— */}
      <footer className="border-t border-border/80 bg-muted/30 py-12 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldAlert className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-foreground">CommitCheck</span>
              <span className="text-muted-foreground">
                — AI-Powered Project Protection
              </span>
            </div>

            <div className="flex items-center gap-6">
              <Link to="/design-system" className="hover:text-foreground transition-colors">
                Design System Bench
              </Link>
              <Link to="/login" className="hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="hover:text-foreground transition-colors">
                Get Started
              </Link>
            </div>
          </div>

          <div className="mt-8 border-t border-border/60 pt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p>© {new Date().getFullYear()} CommitCheck. All rights reserved.</p>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Verification Engine Online</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
