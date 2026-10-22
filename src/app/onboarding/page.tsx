import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import {
  ShieldCheck,
  GitBranch,
  Video,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  AlertCircle,
} from "lucide-react";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Hero Section */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
            Platform Onboarding & Architecture Guide
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-4">
            How CommitCheck Works
          </h1>
          <p className="text-base text-[#6a6a6a] leading-relaxed">
            CommitCheck replaces ambiguous verbal handshakes with verifiable code delivery. Learn how the Google Meet bot, Linear task sync, and AI code auditing bridge discovery calls to shipped GitHub pull requests.
          </p>
        </div>

        {/* Tabbed / Dual Path Walkthrough */}
        <div className="space-y-16">
          {/* Section 1: The Freelancer Journey */}
          <section aria-labelledby="freelancer-journey" className="p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#222222] text-white flex items-center justify-center font-bold text-sm">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Workflow 01</span>
                <h2 id="freelancer-journey" className="text-2xl font-semibold text-[#222222]">
                  The Freelancer Developer Workflow
                </h2>
              </div>
            </div>

            <p className="text-sm text-[#3f3f3f] mb-8 leading-relaxed">
              Never let scope creep derail your delivery timelines. CommitCheck turns discovery call audio into approved Linear tasks with client buy-in before you write a single line of code.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-[10px] bg-[#f7f7f7] border border-[#dddddd] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#ff385c]">STEP 1</span>
                    <Video className="w-4 h-4 text-[#6a6a6a]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#222222] mb-1.5">Dispatch Meeting Bot</h3>
                  <p className="text-xs text-[#6a6a6a] leading-relaxed">
                    Paste your Google Meet room link. Our automated Recall.ai bot joins, listens, and captures a verbatim, diarized audio transcript.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#dddddd] text-[11px] text-[#6a6a6a]">
                  Automatic participant identification
                </div>
              </div>

              <div className="p-5 rounded-[10px] bg-[#f7f7f7] border border-[#dddddd] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#ff385c]">STEP 2</span>
                    <Sparkles className="w-4 h-4 text-[#ff385c]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#222222] mb-1.5">Review 4-Tier Scope</h3>
                  <p className="text-xs text-[#6a6a6a] leading-relaxed">
                    Gemini 1.5 Pro extracts tasks into Explicit Requirements, Confirmed Commitments, AI-Inferred items, and Tentative ideas.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#dddddd] text-[11px] text-[#6a6a6a]">
                  Pre-publish staging review gate
                </div>
              </div>

              <div className="p-5 rounded-[10px] bg-[#f7f7f7] border border-[#dddddd] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#ff385c]">STEP 3</span>
                    <Layers className="w-4 h-4 text-[#5e6ad2]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#222222] mb-1.5">1-Click Linear Sync</h3>
                  <p className="text-xs text-[#6a6a6a] leading-relaxed">
                    Publish approved tasks directly into your connected Linear workspace. Transactional emails inform your client immediately.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#dddddd] text-[11px] text-[#6a6a6a]">
                  Resend stakeholder notification
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#dddddd] flex items-center justify-between">
              <span className="text-xs text-[#6a6a6a]">Ready to connect your GitHub repo?</span>
              <Link
                href="/freelancer/projects/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#222222] text-white hover:bg-black text-xs font-semibold transition-all"
              >
                Create Project
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* Section 2: The Client Audit Journey */}
          <section aria-labelledby="client-journey" className="p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#ff385c] text-white flex items-center justify-center font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">Workflow 02</span>
                <h2 id="client-journey" className="text-2xl font-semibold text-[#222222]">
                  The Client Verification Portal
                </h2>
              </div>
            </div>

            <p className="text-sm text-[#3f3f3f] mb-8 leading-relaxed">
              Never accept status reports on blind faith. CommitCheck inspects the freelancer&apos;s git codebase directly and cross-examines commit diffs against agreed Linear milestones.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-[10px] bg-[#f7f7f7] border border-[#dddddd] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#ff385c]">FEATURE 1</span>
                    <FileCheck2 className="w-4 h-4 text-[#ff385c]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#222222] mb-1.5">Scope Confirmation</h3>
                  <p className="text-xs text-[#6a6a6a] leading-relaxed">
                    When your freelancer stages tentative ideas from your calls, you receive an itemized confirmation link with exact transcript evidence.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#dddddd] text-[11px] text-[#6a6a6a]">
                  You decide what enters billing scope
                </div>
              </div>

              <div className="p-5 rounded-[10px] bg-[#f7f7f7] border border-[#dddddd] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#ff385c]">FEATURE 2</span>
                    <Sparkles className="w-4 h-4 text-[#ff385c]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#222222] mb-1.5">Dual-Tier Code Auditing</h3>
                  <p className="text-xs text-[#6a6a6a] leading-relaxed">
                    Click &ldquo;Verify Progress&rdquo; at any time. We syntactically check Linear ticket keys and semantically evaluate git AST diffs using Gemini.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#dddddd] text-[11px] text-[#6a6a6a]">
                  Verified Completion % score
                </div>
              </div>

              <div className="p-5 rounded-[10px] bg-[#f7f7f7] border border-[#dddddd] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#c13515]">FEATURE 3</span>
                    <AlertCircle className="w-4 h-4 text-[#c13515]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#222222] mb-1.5">Ghost Completion Flags</h3>
                  <p className="text-xs text-[#6a6a6a] leading-relaxed">
                    If a ticket was marked &ldquo;Done&rdquo; in Linear but lacks corresponding commits in GitHub, an instant discrepancy alert is raised.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#dddddd] text-[11px] text-[#6a6a6a]">
                  Direct &ldquo;Request Clarification&rdquo; action
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#dddddd] flex items-center justify-between">
              <span className="text-xs text-[#6a6a6a]">Have a project assigned to your email?</span>
              <Link
                href="/client"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold transition-all shadow-sm"
              >
                Access Client Portal
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* Section 3: Key Vocabulary from GLOSSARY.md */}
          <section aria-labelledby="glossary-summary" className="p-8 rounded-[14px] bg-[#f7f7f7] border border-[#dddddd]">
            <h3 id="glossary-summary" className="text-lg font-semibold text-[#222222] mb-4">
              Core Terminology (from CommitCheck Glossary)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#3f3f3f]">
              <div className="p-4 rounded-[8px] bg-white border border-[#dddddd]">
                <strong className="text-[#222222] block mb-1">Ghost Completion</strong>
                A severe discrepancy where a task is marked &ldquo;Done&rdquo; in Linear, but repository inspection uncovers zero matching implementation code.
              </div>
              <div className="p-4 rounded-[8px] bg-white border border-[#dddddd]">
                <strong className="text-[#222222] block mb-1">Scope Addendum</strong>
                An incremental batch of tasks derived from a follow-up meeting, appended to an existing Project&apos;s Linear board rather than creating fragmented boards.
              </div>
              <div className="p-4 rounded-[8px] bg-white border border-[#dddddd]">
                <strong className="text-[#222222] block mb-1">Scope Confirmation</strong>
                A formal verification action by the Client converting tentative or AI-inferred requirements into approved development scope.
              </div>
              <div className="p-4 rounded-[8px] bg-white border border-[#dddddd]">
                <strong className="text-[#222222] block mb-1">Audit Report</strong>
                An immutable record produced during an Audit, summarizing verified completion percentage and itemized discrepancies with a 10-minute SHA cache.
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
