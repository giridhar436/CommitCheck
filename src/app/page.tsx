import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import {
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Check,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

// Official vector logos for high-trust toolchain
function GitHubLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function GoogleLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function LinearLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 12a9.5 9.5 0 0 1 15.656-7.147l-12.803 12.8A9.467 9.467 0 0 1 2.5 12zm2.08 5.743L17.743 4.58A9.5 9.5 0 0 1 19.5 12a9.5 9.5 0 0 1-14.92 5.743z" />
    </svg>
  );
}

function RecallLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v-1a8 8 0 0 1 14.93-4M20 12v1a8 8 0 0 1-14.93 4" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; auth?: string; role?: string }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-[#ff385c] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[1280px] mx-auto px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[8px] bg-[#ff385c] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold text-[17px] tracking-tight text-ink">
              CommitCheck
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink">
                  {session.name || session.email}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-inset text-ink border border-border">
                  {session.role}
                </span>
                <Link
                  href={session.role === "FREELANCER" ? "/freelancer" : "/client"}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-[8px] transition-all shadow-sm"
                >
                  Go to Dashboard
                </Link>
                <a
                  href="/api/auth/logout"
                  className="px-3 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  Sign out
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <a
                  href="/api/auth/github"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-ink bg-surface-raised hover:bg-surface-inset rounded-[8px] border border-border transition-all"
                >
                  <GitHubLogo className="w-3.5 h-3.5 text-ink" />
                  Freelancer Login
                </a>
                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-[8px] transition-all shadow-xs"
                >
                  <GoogleLogo className="w-3.5 h-3.5" />
                  Client Portal
                </a>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Role Alert / Error Messages */}
      {params.error && (
        <div className="bg-error-bg border-b border-error-border px-6 py-3">
          <div className="max-w-[1280px] mx-auto flex items-center gap-2 text-sm text-error-text font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{params.error}</span>
          </div>
        </div>
      )}

      {params.auth === "required" && (
        <div className="bg-surface border-b border-border px-6 py-3.5">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between text-sm text-ink gap-3">
            <span>
              Please authenticate as a <strong>{params.role}</strong> to access that workspace.
            </span>
            <div className="flex gap-2.5">
              {session ? (
                <Link
                  href={session.role === "FREELANCER" ? "/freelancer" : "/client"}
                  className="text-xs px-3.5 py-1.5 bg-[#ff385c] text-white rounded-full font-medium hover:bg-[#e00b41] transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <a
                    href="/api/auth/github"
                    className="text-xs px-3 py-1.5 bg-surface-raised border border-border rounded-full font-medium text-ink hover:border-border-strong transition-colors"
                  >
                    Sign in with GitHub
                  </a>
                  <a
                    href="/api/auth/google"
                    className="text-xs px-3 py-1.5 bg-[#ff385c] text-white rounded-full font-medium hover:bg-[#e00b41] transition-colors"
                  >
                    Sign in with Google
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                           */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden saas-hero-glow border-b border-border-soft pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="max-w-3xl flex flex-col items-start text-left">
              {/* Micro Announcement Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-medium text-ink shadow-xs mb-6">
                <span className="w-2 h-2 rounded-full bg-[#ff385c] animate-pulse"></span>
                <span className="font-semibold text-ink">Continuous Freelance Delivery</span>
              </div>

              {/* Editorial Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-bold tracking-[-0.035em] text-ink leading-[1.08] mb-6">
                From discovery calls to shipped commits.{" "}
                <span className="text-[#ff385c] inline-block">
                  Verifiably synchronized.
                </span>
              </h1>

              {/* Supporting Editorial Paragraph */}
              <p className="text-lg md:text-[19px] text-ink-secondary leading-relaxed mb-8 max-w-[620px]">
                CommitCheck bridges Google Meet discovery agreements, Linear milestone tracking, and GitHub commit syntax trees. 
                Clients get verified progress transparency; Freelancers lock agreed scope and prevent unbilled creep.
              </p>

              {/* Action Gateway */}
              {session ? (
                <div className="flex items-center gap-3 w-full sm:w-auto mb-10">
                  <Link
                    href={session.role === "FREELANCER" ? "/freelancer" : "/client"}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm group"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-10">
                  <a
                    href="/api/auth/github"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-[8px] bg-ink text-canvas hover:opacity-90 font-medium text-sm transition-all shadow-sm group"
                  >
                    <GitHubLogo className="w-4 h-4 text-canvas" />
                    <span>Freelancer Sign-in</span>
                    <span className="text-xs text-ink-faint font-mono group-hover:text-canvas transition-colors">
                      (GitHub)
                    </span>
                  </a>

                  <a
                    href="/api/auth/google"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm group"
                  >
                    <GoogleLogo className="w-4 h-4" />
                    <span>Enter Client Portal</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              )}

              {/* Precision Toolchain Trust Indicators */}
              <div className="pt-6 border-t border-border-soft w-full max-w-[620px]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-3">
                  Native verification pipeline across your stack
                </p>
                <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs font-medium text-ink-secondary">
                  <div className="flex items-center gap-2">
                    <GitHubLogo className="w-4 h-4 text-ink" />
                    <span>GitHub AST Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LinearLogo className="w-4 h-4 text-[#5e6ad2]" />
                    <span>Linear Workspace Sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RecallLogo className="w-4 h-4 text-[#ff385c]" />
                    <span>Recall.ai Transcription</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GoogleLogo className="w-4 h-4" />
                    <span>Google Meet Capture</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. DUAL-ROLE ARCHITECTURE (Freelancers vs Clients Portal Cards)            */}
        {/* ========================================================================= */}
        <section className="py-20 md:py-28 border-b border-border-soft">
          <div className="max-w-[1280px] mx-auto px-6">
            
            {/* Section Header */}
            <div className="max-w-2xl mb-16">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c] mb-2 block">
                Two Portals &middot; One Source of Truth
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink mb-4">
                Engineered for both sides of high-stakes software contracts.
              </h2>
              <p className="text-ink-secondary text-base leading-relaxed">
                Freelancers protect their compensation against scope creep. Clients get guaranteed proof that their budget produced working, verified code.
              </p>
            </div>

            {/* Split: Column 1 (Freelancer) vs Column 2 (Client) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              
              {/* FREELANCER WORKFLOW (6 cols) */}
              <div className="lg:col-span-6 bg-surface-raised rounded-[14px] border border-border p-8 md:p-10 flex flex-col justify-between saas-card-hover relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-ink rounded-t-[14px]"></div>
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                      DEVELOPER FLOW
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-inset text-ink border border-border">
                      <GitHubLogo className="w-3.5 h-3.5 text-ink" />
                      Freelancer Portal
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-ink mb-3">
                    Automate scope freeze. Stop working for free.
                  </h3>
                  
                  <p className="text-sm text-ink-secondary leading-relaxed mb-6">
                    Discovery calls are full of spoken promises that get forgotten or morphed into unpaid scope creep. CommitCheck deploys an autonomous Recall bot into your call, structures every agreement into testable deliverables, and holds clients to signed milestones.
                  </p>

                  <ul className="space-y-3 mb-8 text-sm text-ink-secondary">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-ink shrink-0" />
                      <span>One-click sync to your personal or client Linear team</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-ink shrink-0" />
                      <span>AST diff proves your implementation conforms to spec</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-ink shrink-0" />
                      <span>Never face payment disputes over &quot;unmet expectations&quot;</span>
                    </li>
                  </ul>
                </div>

                {session?.role === "FREELANCER" ? (
                  <div>
                    <Link
                      href="/freelancer"
                      className="w-full flex items-center justify-center gap-2.5 h-12 rounded-[8px] bg-ink text-canvas hover:opacity-90 font-medium text-sm transition-all shadow-sm group"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                ) : !session ? (
                  <div>
                    <a
                      href="/api/auth/github"
                      className="w-full flex items-center justify-center gap-2.5 h-12 rounded-[8px] bg-ink text-canvas hover:opacity-90 font-medium text-sm transition-all shadow-sm"
                    >
                      <GitHubLogo className="w-4 h-4 text-canvas" />
                      Sign in with GitHub
                    </a>
                    <p className="text-[11px] text-ink-muted text-center mt-2.5">
                      Read-only repository access to map your commit trees to tickets.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* CLIENT WORKFLOW (6 cols) */}
              <div className="lg:col-span-6 bg-surface-raised rounded-[14px] border border-rausch-border p-8 md:p-10 flex flex-col justify-between saas-card-hover relative shadow-[0_4px_24px_rgba(255,56,92,0.06)] dark:shadow-[0_4px_24px_rgba(255,56,92,0.1)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff385c] rounded-t-[14px]"></div>
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#ff385c]">
                      EXECUTIVE AUDIT
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rausch-bg text-rausch-text border border-rausch-border">
                      <GoogleLogo className="w-3.5 h-3.5" />
                      Client Portal
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-ink mb-3">
                    Verify deliverables in real code. Not status slides.
                  </h3>
                  
                  <p className="text-sm text-ink-secondary leading-relaxed mb-6">
                    Non-technical founders and executives frequently get burned by freelance developers marking Jira tasks &quot;Done&quot; without shipping real code. CommitCheck uses Gemini 2.5 and AST analysis to audit actual git commits against stated milestones.
                  </p>

                  <ul className="space-y-3 mb-8 text-sm text-ink-secondary">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#ff385c] shrink-0" />
                      <span>Continuous syntactic AST comparison on every git push</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#ff385c] shrink-0" />
                      <span>Executive plain-English summaries of complex pull requests</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#ff385c] shrink-0" />
                      <span>Instant dispute protection with cryptographically signed reports</span>
                    </li>
                  </ul>
                </div>

                {session?.role === "CLIENT" ? (
                  <div>
                    <Link
                      href="/client"
                      className="w-full flex items-center justify-center gap-2.5 h-12 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm group"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                ) : !session ? (
                  <div>
                    <a
                      href="/api/auth/google"
                      className="w-full flex items-center justify-center gap-2.5 h-12 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm group"
                    >
                      <GoogleLogo className="w-4 h-4" />
                      Sign in with Google
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <p className="text-[11px] text-ink-muted text-center mt-2.5">
                      Friction-free Google workspace login for project sponsors and clients.
                    </p>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. HIGH-IMPACT EDITORIAL CTA                                              */}
        {/* ========================================================================= */}
        <section className="py-20 md:py-28 bg-canvas">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="rounded-[16px] border border-border bg-surface p-10 md:p-16 text-center max-w-4xl mx-auto airbnb-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#ff385c]/10 to-transparent rounded-bl-full pointer-events-none"></div>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-raised border border-border text-xs font-medium text-ink mb-6 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#ff385c]" />
                Zero unverified code. Zero scope creep.
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink mb-4">
                Ready for verified software delivery?
              </h2>

              <p className="text-base sm:text-lg text-ink-secondary max-w-xl mx-auto mb-8 leading-relaxed">
                Connect your GitHub repository and Google account to experience verifiable freelance audits today.
              </p>

              {session ? (
                <div className="flex justify-center">
                  <Link
                    href={session.role === "FREELANCER" ? "/freelancer" : "/client"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm group"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="/api/auth/github"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[8px] bg-ink text-canvas hover:opacity-90 font-medium text-sm transition-all shadow-sm"
                  >
                    <GitHubLogo className="w-4 h-4 text-canvas" />
                    Sign in with GitHub (Freelancer)
                  </a>
                  <a
                    href="/api/auth/google"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm group"
                  >
                    <GoogleLogo className="w-4 h-4" />
                    Enter Client Portal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-success-text" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-success-text" />
                  Free 14-day discovery pilot
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-success-text" />
                  SOC2 compliant audit logging
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 4. CLEAN FOOTER (Per DESIGN.md specification)                             */}
      {/* ========================================================================= */}
      <footer className="border-t border-border-soft bg-canvas pt-12 pb-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-[6px] bg-[#ff385c] flex items-center justify-center text-white font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-sm text-ink">CommitCheck</span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed max-w-[200px]">
                Continuous freelance delivery verification from Google Meet discovery to shipped GitHub commits.
              </p>
            </div>

            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-ink mb-3">
                Platform
              </div>
              <ul className="space-y-2 text-xs text-ink-secondary">
                {session?.role === "FREELANCER" ? (
                  <li>
                    <Link href="/freelancer" className="hover:text-ink transition-colors">
                      Freelancer Dashboard
                    </Link>
                  </li>
                ) : session?.role === "CLIENT" ? (
                  <li>
                    <Link href="/client" className="hover:text-ink transition-colors">
                      Client Dashboard
                    </Link>
                  </li>
                ) : (
                  <>
                    <li>
                      <a href="/api/auth/github" className="hover:text-ink transition-colors">
                        Freelancer Portal
                      </a>
                    </li>
                    <li>
                      <a href="/api/auth/google" className="hover:text-ink transition-colors">
                        Client Audit Portal
                      </a>
                    </li>
                  </>
                )}
                <li><span className="hover:text-ink cursor-pointer transition-colors">AST Semantic Verification</span></li>
                <li><span className="hover:text-ink cursor-pointer transition-colors">Recall.ai Meeting Bot</span></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-ink mb-3">
                Integrations
              </div>
              <ul className="space-y-2 text-xs text-ink-secondary">
                <li><span className="hover:text-ink cursor-pointer transition-colors">GitHub Commits & PRs</span></li>
                <li><span className="hover:text-ink cursor-pointer transition-colors">Linear Workspaces</span></li>
                <li><span className="hover:text-ink cursor-pointer transition-colors">Google Meet Discovery</span></li>
                <li><span className="hover:text-ink cursor-pointer transition-colors">Gemini 2.5 AI Pipeline</span></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-ink mb-3">
                System Status
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-inset border border-border text-xs text-ink mb-3">
                <span className="w-2 h-2 rounded-full bg-success-dot animate-pulse"></span>
                <span>All engines operational</span>
              </div>
              <div className="text-[11px] text-ink-muted">
                AST verification latency: 640ms avg
              </div>
            </div>
          </div>

          <div className="border-t border-border-soft pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-4">
            <div>
              &copy; {new Date().getFullYear()} CommitCheck, Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <span className="hover:text-ink cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-ink cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-ink cursor-pointer transition-colors">Security Standards</span>
              <span className="hover:text-ink cursor-pointer transition-colors">Documentation</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
