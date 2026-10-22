import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import {
  CheckCircle2,
  ShieldCheck,
  GitBranch,
  ArrowRight,
  Video,
  Sparkles,
  AlertTriangle,
  Code2,
  Layers,
  Check,
  Activity,
  Terminal,
  FileCheck,
  ChevronRight,
  GitCommit,
  GitPullRequest,
  Lock,
  Zap,
} from "lucide-react";

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
    <div className="min-h-screen bg-white text-[#222222] flex flex-col font-sans selection:bg-[#ff385c] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#ebebeb]">
        <div className="max-w-[1280px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#ff385c] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-[17px] tracking-tight text-[#18181b]">
                CommitCheck
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]">
                AST Engine v1.0
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#18181b]">
                  {session.name || session.email}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
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
                  className="px-3 py-2 text-sm text-[#71717a] hover:text-[#18181b] transition-colors"
                >
                  Sign out
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <a
                  href="/api/auth/github"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-[#18181b] bg-white hover:bg-[#f4f4f5] rounded-[8px] border border-[#dddddd] transition-all"
                >
                  <GitHubLogo className="w-3.5 h-3.5 text-[#18181b]" />
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
        <div className="bg-[#fff8f6] border-b border-[#fbd5cb] px-6 py-3">
          <div className="max-w-[1280px] mx-auto flex items-center gap-2 text-sm text-[#c13515] font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{params.error}</span>
          </div>
        </div>
      )}

      {params.auth === "required" && (
        <div className="bg-[#fafafa] border-b border-[#ebebeb] px-6 py-3.5">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between text-sm text-[#18181b] gap-3">
            <span>
              Please authenticate as a <strong>{params.role}</strong> to access that workspace.
            </span>
            <div className="flex gap-2.5">
              <a
                href="/api/auth/github"
                className="text-xs px-3 py-1.5 bg-white border border-[#dddddd] rounded-full font-medium text-[#18181b] hover:border-[#18181b] transition-colors"
              >
                Sign in with GitHub
              </a>
              <a
                href="/api/auth/google"
                className="text-xs px-3 py-1.5 bg-[#ff385c] text-white rounded-full font-medium hover:bg-[#e00b41] transition-colors"
              >
                Sign in with Google
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* ========================================================================= */}
        {/* 1. ASYMMETRICAL EDITORIAL HERO (60% Left Narrative / 40% Right Product UI) */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden saas-hero-glow border-b border-[#ebebeb] pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
              
              {/* LEFT COLUMN: ~60% (7 of 12 columns) Editorial Hierarchy */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                {/* Micro Announcement Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fafafa] border border-[#e4e4e7] text-xs font-medium text-[#18181b] shadow-xs mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#ff385c] animate-pulse"></span>
                  <span className="font-semibold text-[#18181b]">Continuous Freelance Delivery</span>
                  <span className="text-[#a1a1aa]">&middot;</span>
                  <span className="text-[#71717a]">Dual-Tier AST Engine</span>
                </div>

                {/* Editorial Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-bold tracking-[-0.035em] text-[#18181b] leading-[1.08] mb-6">
                  From discovery calls to shipped commits.{" "}
                  <span className="text-[#ff385c] inline-block">
                    Verifiably synchronized.
                  </span>
                </h1>

                {/* Supporting Editorial Paragraph */}
                <p className="text-lg md:text-[19px] text-[#52525b] leading-relaxed mb-8 max-w-[580px]">
                  CommitCheck bridges Google Meet discovery agreements, Linear milestone tracking, and GitHub commit syntax trees. 
                  Clients get verified progress transparency; Freelancers lock agreed scope and prevent unbilled creep.
                </p>

                {/* Dual-Path Action Gateway */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-10">
                  <a
                    href="/api/auth/github"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-[8px] bg-[#18181b] text-white hover:bg-black font-medium text-sm transition-all shadow-sm group"
                  >
                    <GitHubLogo className="w-4 h-4 text-white" />
                    <span>Freelancer Sign-in</span>
                    <span className="text-xs text-[#a1a1aa] font-mono group-hover:text-white transition-colors">
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

                {/* Precision Toolchain Trust Indicators */}
                <div className="pt-6 border-t border-[#ebebeb] w-full max-w-[580px]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a] mb-3">
                    Native verification pipeline across your stack
                  </p>
                  <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs font-medium text-[#52525b]">
                    <div className="flex items-center gap-2">
                      <GitHubLogo className="w-4 h-4 text-[#18181b]" />
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

              {/* RIGHT COLUMN: ~40% (5 of 12 columns) Layered Product Visualization */}
              <div className="lg:col-span-5 relative mt-6 lg:mt-0">
                <div className="relative mx-auto max-w-[460px] lg:max-w-none">
                  
                  {/* Subtle Ambient Rausch Depth Glow */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-[#ff385c]/10 via-[#ff385c]/5 to-transparent rounded-[24px] blur-2xl -z-10 pointer-events-none"></div>

                  {/* LAYER 1: Core Live Audit Dashboard Window */}
                  <div className="bg-white rounded-[14px] border border-[#dddddd] airbnb-shadow overflow-hidden">
                    {/* Window Header */}
                    <div className="bg-[#fafafa] border-b border-[#ebebeb] px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#dddddd]"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#dddddd]"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#dddddd]"></span>
                        <span className="ml-2 font-mono text-[11px] text-[#71717a]">
                          audit.live // engagement-alpha
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        AST SYNCHRONIZED
                      </span>
                    </div>

                    {/* Window Body: Target Milestone & Verification Metric */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      {/* Ticket Context */}
                      <div className="flex items-center justify-between border-b border-[#f4f4f5] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#f4f4f5] text-[11px] font-mono font-semibold text-[#18181b] border border-[#e4e4e7]">
                            ENG-108
                          </span>
                          <span className="text-xs font-semibold text-[#18181b] truncate max-w-[190px] sm:max-w-[220px]">
                            Stripe Webhook Idempotency Check
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          100% Match
                        </span>
                      </div>

                      {/* Real AST Code Verification Preview */}
                      <div className="rounded-[8px] bg-[#18181b] p-3 text-white font-mono text-[11px] leading-relaxed overflow-hidden">
                        <div className="flex items-center justify-between text-[10px] text-[#71717a] mb-2 border-b border-[#27272a] pb-1">
                          <span className="flex items-center gap-1.5">
                            <GitCommit className="w-3 h-3 text-[#ff385c]" />
                            commit 8f9c21d
                          </span>
                          <span>src/lib/webhooks.ts</span>
                        </div>
                        <div className="text-[#a1a1aa] space-y-0.5">
                          <div className="text-emerald-400">
                            + async function verifyWebhook(eventId: string) &#123;
                          </div>
                          <div className="text-emerald-400 pl-3">
                            + const exists = await redis.get(`evt:$&#123;eventId&#125;`);
                          </div>
                          <div className="text-emerald-400 pl-3">
                            + if (exists) return &#123; duplicate: true &#125;;
                          </div>
                          <div className="text-emerald-400 pl-3">
                            + await recordAuditLog(eventId, &quot;PROCESSED&quot;);
                          </div>
                          <div className="text-[#71717a]">&#125;</div>
                        </div>
                      </div>

                      {/* Verification Telemetry Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-[8px] bg-[#fafafa] border border-[#ebebeb]">
                          <div className="text-[#71717a] text-[10px]">AST Confidence</div>
                          <div className="font-semibold text-[#18181b] mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            99.4% Semantic Match
                          </div>
                        </div>
                        <div className="p-2.5 rounded-[8px] bg-[#fafafa] border border-[#ebebeb]">
                          <div className="text-[#71717a] text-[10px]">Ghost Commit Check</div>
                          <div className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Zero Untracked Diffs
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LAYER 2: Floating Foreground Dialogue-to-Scope Artifact */}
                  <div className="floating-layer mt-3 sm:mt-0 sm:absolute sm:-bottom-6 sm:-left-6 w-full sm:w-[94%] bg-white/95 backdrop-blur-md rounded-[12px] border border-[#dddddd] shadow-lg p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-[#ff385c]" />
                        <span className="text-[11px] font-semibold text-[#18181b]">
                          Discovery Call Transcript
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#71717a]">
                        00:14:22 &middot; Google Meet
                      </span>
                    </div>

                    <p className="text-xs text-[#3f3f46] italic bg-[#fafafa] p-2 rounded border border-[#ebebeb] mb-2 leading-relaxed">
                      &ldquo;We need a webhook handler with idempotency verification before Stripe payouts trigger.&rdquo;
                    </p>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 font-medium text-[#18181b]">
                        <Sparkles className="w-3 h-3 text-[#ff385c]" />
                        Mapped to <strong className="font-mono">ENG-108</strong>
                      </span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Signed off
                      </span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. RESTRAINED METRICS RIBBON (Typography First, Zero Generic Box Clutter)  */}
        {/* ========================================================================= */}
        <section className="border-b border-[#ebebeb] bg-[#fafafa]/50 py-10">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div>
                <div className="text-3xl lg:text-4xl font-bold tracking-tight text-[#18181b] font-sans">
                  100%
                </div>
                <div className="text-xs font-semibold text-[#18181b] mt-1">
                  Semantic AST Verification
                </div>
                <div className="text-xs text-[#71717a] mt-0.5">
                  Full syntax tree inspection, not just text diffs
                </div>
              </div>

              <div>
                <div className="text-3xl lg:text-4xl font-bold tracking-tight text-[#18181b] font-sans">
                  &lt; 800ms
                </div>
                <div className="text-xs font-semibold text-[#18181b] mt-1">
                  Commit-to-Audit Latency
                </div>
                <div className="text-xs text-[#71717a] mt-0.5">
                  Instant webhook validation on git push
                </div>
              </div>

              <div>
                <div className="text-3xl lg:text-4xl font-bold tracking-tight text-[#18181b] font-sans">
                  Zero
                </div>
                <div className="text-xs font-semibold text-[#18181b] mt-1">
                  Ghost Completions Allowed
                </div>
                <div className="text-xs text-[#71717a] mt-0.5">
                  Empty PRs or dummy comments fail audit automatically
                </div>
              </div>

              <div>
                <div className="text-3xl lg:text-4xl font-bold tracking-tight text-[#18181b] font-sans">
                  Autonomous
                </div>
                <div className="text-xs font-semibold text-[#18181b] mt-1">
                  Call Scope Extraction
                </div>
                <div className="text-xs text-[#71717a] mt-0.5">
                  Recall.ai bot converts audio into approved Linear tasks
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. ASYMMETRICAL DUAL-ROLE ARCHITECTURE (Freelancers vs Clients)            */}
        {/* ========================================================================= */}
        <section className="py-20 md:py-28 border-b border-[#ebebeb]">
          <div className="max-w-[1280px] mx-auto px-6">
            
            {/* Section Header */}
            <div className="max-w-2xl mb-16">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c] mb-2 block">
                Two Portals &middot; One Source of Truth
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18181b] mb-4">
                Engineered for both sides of high-stakes software contracts.
              </h2>
              <p className="text-[#52525b] text-base leading-relaxed">
                Freelancers protect their compensation against scope creep. Clients get guaranteed proof that their budget produced working, verified code.
              </p>
            </div>

            {/* Asymmetric Split: Column 1 (Freelancer) vs Column 2 (Client) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              
              {/* FREELANCER WORKFLOW (6 cols) */}
              <div className="lg:col-span-6 bg-white rounded-[14px] border border-[#dddddd] p-8 md:p-10 flex flex-col justify-between saas-card-hover relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#18181b] rounded-t-[14px]"></div>
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#71717a]">
                      DEVELOPER FLOW
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
                      <GitHubLogo className="w-3.5 h-3.5 text-[#18181b]" />
                      Freelancer Portal
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-[#18181b] mb-3">
                    Automate scope freeze. Stop working for free.
                  </h3>
                  
                  <p className="text-sm text-[#52525b] leading-relaxed mb-6">
                    Discovery calls are full of spoken promises that get forgotten or morphed into unpaid scope creep. CommitCheck deploys an autonomous Recall bot into your call, structures every agreement into testable deliverables, and holds clients to signed milestones.
                  </p>

                  {/* Mini-workflow preview inside Freelancer side */}
                  <div className="rounded-[8px] bg-[#fafafa] border border-[#ebebeb] p-4 mb-8 text-xs space-y-2.5">
                    <div className="font-semibold text-[#18181b] flex items-center justify-between">
                      <span>Live Scope Staging Gate</span>
                      <span className="text-[10px] text-[#ff385c] font-mono">3 Tasks Pending Approval</span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-[#ebebeb] flex items-start gap-2 text-[#3f3f46]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#18181b] mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-[#18181b]">ENG-108:</span> Stripe webhook idempotency check
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-[#ebebeb] flex items-start gap-2 text-[#3f3f46]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#18181b] mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-[#18181b]">ENG-109:</span> Redis sliding window rate limiter
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 text-sm text-[#3f3f46]">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#18181b] shrink-0" />
                      <span>One-click sync to your personal or client Linear team</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#18181b] shrink-0" />
                      <span>AST diff proves your implementation conforms to spec</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#18181b] shrink-0" />
                      <span>Never face payment disputes over &quot;unmet expectations&quot;</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <a
                    href="/api/auth/github"
                    className="w-full flex items-center justify-center gap-2.5 h-12 rounded-[8px] bg-[#18181b] text-white hover:bg-black font-medium text-sm transition-all shadow-sm"
                  >
                    <GitHubLogo className="w-4 h-4 text-white" />
                    Sign in with GitHub
                  </a>
                  <p className="text-[11px] text-[#71717a] text-center mt-2.5">
                    Read-only repository access to map your commit trees to tickets.
                  </p>
                </div>
              </div>

              {/* CLIENT WORKFLOW (6 cols) */}
              <div className="lg:col-span-6 bg-white rounded-[14px] border border-[#ffd1da] p-8 md:p-10 flex flex-col justify-between saas-card-hover relative shadow-[0_4px_24px_rgba(255,56,92,0.06)]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff385c] rounded-t-[14px]"></div>
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#ff385c]">
                      EXECUTIVE AUDIT
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fff0f3] text-[#ff385c] border border-[#ffd1da]">
                      <GoogleLogo className="w-3.5 h-3.5" />
                      Client Portal
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-[#18181b] mb-3">
                    Verify deliverables in real code. Not status slides.
                  </h3>
                  
                  <p className="text-sm text-[#52525b] leading-relaxed mb-6">
                    Non-technical founders and executives frequently get burned by freelance developers marking Jira tasks &quot;Done&quot; without shipping real code. CommitCheck uses Gemini 2.5 and AST analysis to audit actual git commits against stated milestones.
                  </p>

                  {/* Mini-workflow preview inside Client side */}
                  <div className="rounded-[8px] bg-[#fff8f9] border border-[#ffd1da] p-4 mb-8 text-xs space-y-2.5">
                    <div className="font-semibold text-[#18181b] flex items-center justify-between">
                      <span>Executive Milestone Audit</span>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        VERIFIED IN CODE
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-[#fbd5cb] flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#18181b]">Milestone 2: Payment Pipeline</div>
                        <div className="text-[11px] text-[#71717a]">4 commits &middot; 382 insertions &middot; 100% test pass</div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700">Audit Passed</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#52525b] pt-1">
                      <span>Ghost PR detection: <strong className="text-emerald-700">0 anomalies</strong></span>
                      <span className="text-[#ff385c] font-medium">Ready for payout release</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 text-sm text-[#3f3f46]">
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

                <div>
                  <a
                    href="/api/auth/google"
                    className="w-full flex items-center justify-center gap-2.5 h-12 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm group"
                  >
                    <GoogleLogo className="w-4 h-4" />
                    Sign in with Google
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                  <p className="text-[11px] text-[#71717a] text-center mt-2.5">
                    Friction-free Google workspace login for project sponsors and clients.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. ALTERNATING EDITORIAL DEEP-DIVES (Visual Rhythm, No Generic Card Duplication) */}
        {/* ========================================================================= */}
        <section className="py-20 md:py-28 bg-[#fafafa]/50 border-b border-[#ebebeb]">
          <div className="max-w-[1280px] mx-auto px-6 space-y-24">
            
            {/* Deep-Dive 1: Left Visual / Right Editorial Narrative */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              
              {/* Left Artifact: Dialogue Extraction & Linear Sync Visual */}
              <div className="lg:col-span-6 bg-white rounded-[14px] border border-[#dddddd] airbnb-shadow p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-[#ebebeb] mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff385c]"></div>
                    <span className="font-mono text-xs font-semibold text-[#18181b]">
                      RECALL.BOT // RECORDING
                    </span>
                  </div>
                  <span className="text-xs text-[#71717a] font-mono">google-meet/0942-dx</span>
                </div>

                <div className="space-y-4">
                  {/* Spoken dialogue excerpt */}
                  <div className="p-4 rounded-[8px] bg-[#f4f4f5] border border-[#e4e4e7]">
                    <div className="flex items-center justify-between text-[11px] text-[#71717a] mb-1.5">
                      <span className="font-semibold text-[#18181b]">Elena (Lead Client)</span>
                      <span>12:04 PM</span>
                    </div>
                    <p className="text-xs text-[#27272a] leading-relaxed">
                      &ldquo;The rate limiter must allow 100 requests per minute per IP, and send a 429 response with a Retry-After header.&rdquo;
                    </p>
                  </div>

                  {/* AI Extraction Arrow */}
                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#71717a]">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
                    <span>Gemini 2.5 AST Spec Extractor</span>
                  </div>

                  {/* Generated Linear Issue */}
                  <div className="p-4 rounded-[8px] bg-white border border-[#dddddd] shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono font-semibold text-[#5e6ad2] flex items-center gap-1.5">
                        <LinearLogo className="w-3.5 h-3.5" />
                        ENG-109
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fff0f3] text-[#ff385c]">
                        CONFIRMED SCOPE
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-[#18181b] mb-1">
                      Implement sliding window IP rate limiter (100 req/min)
                    </div>
                    <div className="text-[11px] text-[#71717a]">
                      Acceptance: 429 status code + Retry-After header present in AST test harness
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Narrative */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c] mb-2 block">
                  PHASE 01: SCOPE CAPTURE
                </span>
                <h3 className="text-3xl font-bold tracking-tight text-[#18181b] mb-4">
                  Spoken commitments turned into immutable Linear tickets.
                </h3>
                <p className="text-[#52525b] text-base leading-relaxed mb-6">
                  Freelance contracts fail at the kickoff meeting. Clients mention features in passing; freelancers write code that wasn&apos;t fully spec&apos;d.
                </p>
                <p className="text-[#52525b] text-base leading-relaxed mb-6">
                  CommitCheck solves this at the root. The Recall.ai bot records discovery calls with stakeholder consent, isolates requirements, drafts Linear tasks, and presents a review gate so both parties sign off on the exact definition of done.
                </p>
                <div className="flex items-center gap-6 text-sm font-medium text-[#18181b]">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Verbatim dialogue audio stamps
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Pre-publish review gate
                  </span>
                </div>
              </div>

            </div>

            {/* Deep-Dive 2: Left Narrative / Right Visual (Inverted Rhythm) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              
              {/* Left Narrative */}
              <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c] mb-2 block">
                  PHASE 02: CODE VERIFICATION
                </span>
                <h3 className="text-3xl font-bold tracking-tight text-[#18181b] mb-4">
                  Dual-tier AST analysis beats superficial git diffs.
                </h3>
                <p className="text-[#52525b] text-base leading-relaxed mb-6">
                  Traditional CI checks if a build passes, but cannot determine if a developer actually built what the client paid for. A commit with 500 lines of modified comments or boilerplate can easily fool a non-technical audit.
                </p>
                <p className="text-[#52525b] text-base leading-relaxed mb-6">
                  CommitCheck decomposes every commit into its Abstract Syntax Tree (AST). It parses functions, imports, logic branches, and test assertions to confirm semantic parity with the Linear deliverable.
                </p>
                <div className="flex items-center gap-6 text-sm font-medium text-[#18181b]">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Real syntax tree validation
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Flags ghost commits & empty PRs
                  </span>
                </div>
              </div>

              {/* Right Artifact: Code AST Visual */}
              <div className="lg:col-span-6 bg-[#18181b] text-white rounded-[14px] border border-[#27272a] shadow-xl p-6 sm:p-8 order-1 lg:order-2">
                <div className="flex items-center justify-between pb-4 border-b border-[#27272a] mb-5">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#ff385c]" />
                    <span className="font-mono text-xs font-semibold text-[#f4f4f5]">
                      AST PARSER // SYNTAX TREE
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">STATUS: MATCHED</span>
                </div>

                <div className="font-mono text-xs space-y-3">
                  <div className="p-3 rounded bg-[#27272a]/60 border border-[#3f3f46]">
                    <div className="text-[10px] text-[#a1a1aa] uppercase mb-1">Target Ticket Requirement</div>
                    <div className="text-[#e4e4e7]">&ldquo;SlidingWindowRateLimiter(windowSec: 60, maxHits: 100)&rdquo;</div>
                  </div>

                  <div className="space-y-1.5 pl-3 border-l-2 border-[#ff385c]">
                    <div className="text-[11px] text-[#71717a]">AST Node Identification:</div>
                    <div className="text-emerald-400 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>ClassDeclaration: RateLimiter</span>
                    </div>
                    <div className="text-emerald-400 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>MethodDefinition: checkLimit(ipAddress)</span>
                    </div>
                    <div className="text-emerald-400 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>BinaryExpression: hitCount &gt; maxHits</span>
                    </div>
                    <div className="text-emerald-400 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>CallExpression: res.setHeader(&apos;Retry-After&apos;)</span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-[#a1a1aa] flex items-center justify-between border-t border-[#27272a]">
                    <span>Semantic Confidence: <strong>100%</strong></span>
                    <span className="text-[#ff385c]">0 Unlinked Diffs</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. HIGH-IMPACT EDITORIAL CTA                                              */}
        {/* ========================================================================= */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="rounded-[16px] border border-[#dddddd] bg-[#fafafa] p-10 md:p-16 text-center max-w-4xl mx-auto airbnb-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#ff385c]/10 to-transparent rounded-bl-full pointer-events-none"></div>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#dddddd] text-xs font-medium text-[#18181b] mb-6 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#ff385c]" />
                Zero unverified code. Zero scope creep.
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#18181b] mb-4">
                Ready for verified software delivery?
              </h2>

              <p className="text-base sm:text-lg text-[#52525b] max-w-xl mx-auto mb-8 leading-relaxed">
                Connect your GitHub repository and Google account to experience verifiable freelance audits today.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/api/auth/github"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[8px] bg-[#18181b] text-white hover:bg-black font-medium text-sm transition-all shadow-sm"
                >
                  <GitHubLogo className="w-4 h-4 text-white" />
                  Sign in with GitHub (Freelancer)
                </a>
                <a
                  href="/api/auth/google"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm"
                >
                  <GoogleLogo className="w-4 h-4" />
                  Enter Client Portal
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#71717a]">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Free 14-day discovery pilot
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  SOC2 compliant audit logging
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 6. CLEAN FOOTER (Per DESIGN.md specification)                             */}
      {/* ========================================================================= */}
      <footer className="border-t border-[#ebebeb] bg-white pt-12 pb-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-[6px] bg-[#ff385c] flex items-center justify-center text-white font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-sm text-[#18181b]">CommitCheck</span>
              </div>
              <p className="text-xs text-[#71717a] leading-relaxed max-w-[200px]">
                Continuous freelance delivery verification from Google Meet discovery to shipped GitHub commits.
              </p>
            </div>

            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-[#18181b] mb-3">
                Platform
              </div>
              <ul className="space-y-2 text-xs text-[#52525b]">
                <li><a href="/api/auth/github" className="hover:text-[#18181b] transition-colors">Freelancer Portal</a></li>
                <li><a href="/api/auth/google" className="hover:text-[#18181b] transition-colors">Client Audit Portal</a></li>
                <li><span className="hover:text-[#18181b] cursor-pointer transition-colors">AST Semantic Verification</span></li>
                <li><span className="hover:text-[#18181b] cursor-pointer transition-colors">Recall.ai Meeting Bot</span></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-[#18181b] mb-3">
                Integrations
              </div>
              <ul className="space-y-2 text-xs text-[#52525b]">
                <li><span className="hover:text-[#18181b] cursor-pointer transition-colors">GitHub Commits & PRs</span></li>
                <li><span className="hover:text-[#18181b] cursor-pointer transition-colors">Linear Workspaces</span></li>
                <li><span className="hover:text-[#18181b] cursor-pointer transition-colors">Google Meet Discovery</span></li>
                <li><span className="hover:text-[#18181b] cursor-pointer transition-colors">Gemini 2.5 AI Pipeline</span></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-xs uppercase tracking-wider text-[#18181b] mb-3">
                System Status
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#f4f4f5] border border-[#e4e4e7] text-xs text-[#18181b] mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>All engines operational</span>
              </div>
              <div className="text-[11px] text-[#71717a]">
                AST verification latency: 640ms avg
              </div>
            </div>
          </div>

          <div className="border-t border-[#ebebeb] pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#71717a] gap-4">
            <div>
              &copy; {new Date().getFullYear()} CommitCheck, Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <span className="hover:text-[#18181b] cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-[#18181b] cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-[#18181b] cursor-pointer transition-colors">Security Standards</span>
              <span className="hover:text-[#18181b] cursor-pointer transition-colors">Documentation</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
