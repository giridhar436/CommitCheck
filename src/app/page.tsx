import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { CheckCircle2, ShieldCheck, GitBranch, ArrowRight, Video, Sparkles, AlertTriangle } from "lucide-react";

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
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#dddddd]">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-[#222222]">CommitCheck</span>
              <span className="text-[11px] font-medium text-[#6a6a6a] tracking-wider uppercase -mt-1">
                Meeting-to-Code Verification
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#222222]">
                  {session.name || session.email}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f7f7f7] text-[#222222] border border-[#dddddd]">
                  {session.role}
                </span>
                <Link
                  href={session.role === "FREELANCER" ? "/freelancer" : "/client"}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-[8px] transition-colors"
                >
                  Dashboard
                </Link>
                <a
                  href="/api/auth/logout"
                  className="px-3 py-2 text-sm text-[#6a6a6a] hover:text-[#222222] transition-colors"
                >
                  Sign out
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href="/api/auth/github"
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#222222] bg-[#f7f7f7] hover:bg-[#ebebeb] rounded-[8px] border border-[#dddddd] transition-all"
                >
                  <GitBranch className="w-4 h-4 text-[#222222]" />
                  Freelancer Login
                </a>
                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-[8px] transition-all shadow-sm"
                >
                  Client Portal
                  <ArrowRight className="w-4 h-4" />
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
        <div className="bg-[#f7f7f7] border-b border-[#dddddd] px-6 py-3">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between text-sm text-[#222222]">
            <span>
              Please sign in as a <strong>{params.role}</strong> to access that workspace.
            </span>
            <div className="flex gap-2">
              <a
                href="/api/auth/github"
                className="text-xs px-2.5 py-1 bg-white border border-[#dddddd] rounded-full font-medium hover:border-[#222222]"
              >
                Sign in with GitHub
              </a>
              <a
                href="/api/auth/google"
                className="text-xs px-2.5 py-1 bg-[#ff385c] text-white rounded-full font-medium hover:bg-[#e00b41]"
              >
                Sign in with Google
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-1 max-w-[1280px] mx-auto px-6 py-12 md:py-16 w-full">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
            Continuous Freelance Delivery Verification
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] leading-tight mb-4">
            From discovery call promises to shipped commits. Completely verified.
          </h1>
          <p className="text-lg text-[#3f3f3f] leading-relaxed">
            CommitCheck bridges Google Meet discovery calls, Linear task tracking, and GitHub codebase activity.
            Clients get verified progress transparency; Freelancers get automated scope-freeze protection.
          </p>
        </div>

        {/* Dual Role Authentication Gateways */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Freelancer Gateway Card */}
          <div className="bg-white rounded-[14px] border border-[#dddddd] p-8 flex flex-col justify-between airbnb-shadow-hover relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#222222]"></div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">For Freelancers</span>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[#f7f7f7] text-[#222222] border border-[#dddddd]">
                  Developer Flow
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-[#222222] mb-2">Automate Scope & Freeze Changes</h2>
              <p className="text-sm text-[#3f3f3f] mb-6">
                Connect your repository, paste your Google Meet call link, and let our AI bot extract agreed scope into ready-to-approve Linear tasks.
              </p>

              <ul className="space-y-3 mb-8 text-sm text-[#3f3f3f]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#222222] mt-0.5 shrink-0" />
                  <span>Autonomous Meet bot joins discovery & sync calls</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#222222] mt-0.5 shrink-0" />
                  <span>Gemini extracts tasks with pre-publish review gate</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#222222] mt-0.5 shrink-0" />
                  <span>1-click sync to your native Linear workspace</span>
                </li>
              </ul>
            </div>

            <div>
              <a
                href="/api/auth/github"
                className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-[8px] bg-[#222222] text-white hover:bg-black font-medium text-sm transition-all"
              >
                <GitBranch className="w-4 h-4" />
                Sign in with GitHub
              </a>
              <p className="text-xs text-[#6a6a6a] text-center mt-3">
                Grants read repository access to map commit hashes against Linear tickets.
              </p>
            </div>
          </div>

          {/* Client Gateway Card */}
          <div className="bg-white rounded-[14px] border border-[#dddddd] p-8 flex flex-col justify-between airbnb-shadow-hover relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff385c]"></div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">For Clients</span>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[#fff0f3] text-[#ff385c] border border-[#ffd1da]">
                  Executive Audit
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-[#222222] mb-2">Verify Deliverables in Real Code</h2>
              <p className="text-sm text-[#3f3f3f] mb-6">
                Never wonder if a task marked &ldquo;Done&rdquo; actually has code behind it. Trigger AI verification to audit code commits against stated milestones.
              </p>

              <ul className="space-y-3 mb-8 text-sm text-[#3f3f3f]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#ff385c] mt-0.5 shrink-0" />
                  <span>Dual-tier syntactic & semantic AST diff analysis</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#ff385c] mt-0.5 shrink-0" />
                  <span>Flags Ghost Completions & untracked commits</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#ff385c] mt-0.5 shrink-0" />
                  <span>Immutable audit reports with direct PR verification links</span>
                </li>
              </ul>
            </div>

            <div>
              <a
                href="/api/auth/google"
                className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41] font-medium text-sm transition-all shadow-sm"
              >
                Sign in with Google
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-xs text-[#6a6a6a] text-center mt-3">
                Fast, friction-free login to review project audits and sign off milestones.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Step Architecture Flow */}
        <div className="border-t border-[#dddddd] pt-14">
          <h3 className="text-xl font-semibold text-[#222222] mb-8 text-center">
            How CommitCheck Guarantees Verification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-[14px] bg-[#f7f7f7] border border-[#dddddd]">
              <div className="w-10 h-10 rounded-full bg-white border border-[#dddddd] flex items-center justify-center text-[#222222] font-semibold mb-4">
                <Video className="w-5 h-5 text-[#222222]" />
              </div>
              <h4 className="font-semibold text-base text-[#222222] mb-2">1. Discovery Transcription</h4>
              <p className="text-sm text-[#6a6a6a]">
                A recall bot records your Google Meet discovery call and transcribes stakeholder commitments verbatim.
              </p>
            </div>

            <div className="p-6 rounded-[14px] bg-[#f7f7f7] border border-[#dddddd]">
              <div className="w-10 h-10 rounded-full bg-white border border-[#dddddd] flex items-center justify-center text-[#222222] font-semibold mb-4">
                <Sparkles className="w-5 h-5 text-[#ff385c]" />
              </div>
              <h4 className="font-semibold text-base text-[#222222] mb-2">2. Scope Staging & Linear Sync</h4>
              <p className="text-sm text-[#6a6a6a]">
                Gemini extracts atomic, testable deliverables into a review gate before publishing directly to your Linear workspace.
              </p>
            </div>

            <div className="p-6 rounded-[14px] bg-[#f7f7f7] border border-[#dddddd]">
              <div className="w-10 h-10 rounded-full bg-white border border-[#dddddd] flex items-center justify-center text-[#222222] font-semibold mb-4">
                <ShieldCheck className="w-5 h-5 text-[#222222]" />
              </div>
              <h4 className="font-semibold text-base text-[#222222] mb-2">3. Continuous Code Audits</h4>
              <p className="text-sm text-[#6a6a6a]">
                Every commit is audited against Linear tickets. Ghost completions are flagged instantly on an executive dashboard.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#dddddd] bg-white py-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-[#6a6a6a] gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#222222]">CommitCheck</span>
            <span>&copy; {new Date().getFullYear()} CommitCheck, Inc.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#222222] cursor-pointer">Privacy</span>
            <span className="hover:text-[#222222] cursor-pointer">Terms</span>
            <span className="hover:text-[#222222] cursor-pointer">Documentation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
