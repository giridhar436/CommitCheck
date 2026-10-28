import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import {
  BookOpen,
  GitBranch,
  Video,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function DocsPage() {
  const sections = [
    {
      id: "architecture",
      title: "1. Core Architecture & Identity Model",
      icon: GitBranch,
      content: (
        <div className="space-y-3 text-sm text-ink-secondary leading-relaxed">
          <p>
            CommitCheck enforces a strict provider-level role partitioning model established in <strong>ADR 0001</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Freelancers:</strong> Authenticate exclusively via GitHub OAuth. This guarantees authorized read access to target git repositories and maps commit author emails against Linear tickets.</li>
            <li><strong>Clients:</strong> Authenticate exclusively via Google OAuth. This eliminates separate credential management and allows product owners to sign in with one click to audit deliverables.</li>
          </ul>
          <p className="text-xs text-ink-muted">
            Sessions are secured using HMAC-SHA256 tokens stored in HttpOnly, SameSite=Lax browser cookies (`cc_session`), lasting 7 days.
          </p>
        </div>
      ),
    },
    {
      id: "meeting-bot",
      title: "2. Google Meet Bot & Audio Diarization",
      icon: Video,
      content: (
        <div className="space-y-3 text-sm text-ink-secondary leading-relaxed">
          <p>
            When a Freelancer pastes a Google Meet URL, CommitCheck triggers a Recall.ai meeting bot infrastructure (<strong>ADR 0002, 0005</strong>):
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>The bot enters the virtual meeting room and captures speaker-diarized audio streams.</li>
            <li>Upon call termination, Recall.ai issues a webhook notification verified using Svix cryptographic signatures (`whsec_` secrets).</li>
            <li>CommitCheck fetches the diarized transcript artifact containing timestamped words and participant attributions.</li>
          </ul>
          <div className="p-3.5 rounded-[8px] bg-surface-inset border border-border font-mono text-xs text-ink">
            POST /api/webhooks/recall &bull; Signed via Svix / webhook-signature headers
          </div>
        </div>
      ),
    },
    {
      id: "scope-classification",
      title: "3. 4-Tier Scope Classification Engine",
      icon: Sparkles,
      content: (
        <div className="space-y-3 text-sm text-ink-secondary leading-relaxed">
          <p>
            Raw transcripts are analyzed using Google Gemini 1.5 Pro (<code>gemini-3.8-flash</code>) with strict JSON schema enforcement (<strong>ADR 0015</strong>). Deliverables are classified into four commitment tiers:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-[8px] border border-success-border bg-success-bg">
              <strong className="text-success-text block mb-0.5">Explicit Requirements</strong>
              Directly agreed deliverables from the call. Auto-approved for Linear staging.
            </div>
            <div className="p-3 rounded-[8px] border border-success-border bg-success-bg">
              <strong className="text-success-text block mb-0.5">Confirmed Commitments</strong>
              Concrete milestones promised by the freelancer with deadlines. Auto-approved.
            </div>
            <div className="p-3 rounded-[8px] border border-warning-border bg-warning-bg">
              <strong className="text-warning-text block mb-0.5">AI-Inferred Requirements</strong>
              Baseline technical tasks deduced from product goals. Held pending Client confirmation.
            </div>
            <div className="p-3 rounded-[8px] border border-warning-border bg-warning-bg">
              <strong className="text-warning-text block mb-0.5">Tentative Requirements</strong>
              Speculative ideas or brainstorm items. Held pending Client confirmation.
            </div>
          </div>
          <p className="text-xs text-ink-muted">
            Raw Gemini extractions are cached in <code>Meeting.analysisJson</code> to eliminate redundant API billing.
          </p>
        </div>
      ),
    },
    {
      id: "linear-sync",
      title: "4. Linear Workspace Integration & Scope Addendums",
      icon: Layers,
      content: (
        <div className="space-y-3 text-sm text-ink-secondary leading-relaxed">
          <p>
            CommitCheck operates within the Freelancer&apos;s own Linear workspace via OAuth (<strong>ADR 0003</strong>):
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Batch Publishing:</strong> Staged tasks are converted into native Linear issues and milestone groups.</li>
            <li><strong>Transactional Notification:</strong> Resend delivers HTML emails to the client with direct links to the new Linear project.</li>
            <li><strong>Scope Addendums:</strong> When subsequent sync calls take place, new deliverables append to the existing Linear board rather than fragmenting task tracking.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "audit-engine",
      title: "5. Dual-Tier AI Code Auditing & Ghost Flags",
      icon: ShieldCheck,
      content: (
        <div className="space-y-3 text-sm text-ink-secondary leading-relaxed">
          <p>
            Clients trigger verification at any time to inspect real code delivery against Linear task boards (<strong>ADR 0004, 0007, 0010</strong>):
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Tier 1 — Syntactic Regex Scan:</strong> Matches issue keys (`[A-Z]+-\d+`) in git commit messages, pull request titles, and branch names.</li>
            <li><strong>Tier 2 — Semantic AST Diff Analysis:</strong> Evaluates actual git diff chunks with Gemini against ticket acceptance criteria when commits lack explicit ticket prefixes.</li>
            <li><strong>Ghost Completions:</strong> Tasks marked &ldquo;Done&rdquo; in Linear with zero matching commits or PR code are highlighted as critical discrepancies.</li>
            <li><strong>10-Minute SHA Cache:</strong> Prevents redundant audit runs if no new commit SHAs have landed on GitHub.</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-inset border border-border text-xs font-semibold text-ink mb-4">
            <BookOpen className="w-3.5 h-3.5 text-[#ff385c]" />
            Technical Documentation &amp; Specifications
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink mb-4">
            CommitCheck Platform Documentation
          </h1>
          <p className="text-base text-ink-muted leading-relaxed">
            Comprehensive architectural specifications, integration APIs, and data models for CommitCheck&apos;s meeting-to-code verification pipelines.
          </p>
        </div>

        {/* Table of Contents & Quick Navigation */}
        <div className="p-6 rounded-[14px] bg-surface-inset border border-border mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-3">
            Table of Contents
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-ink hover:text-[#ff385c] hover:underline flex items-center gap-1.5"
              >
                <span className="text-[#ff385c]">&bull;</span>
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Section List */}
        <div className="space-y-12">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.id}
                id={section.id}
                className="p-8 rounded-[14px] border border-border bg-surface-raised airbnb-shadow scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-soft">
                  <div className="w-10 h-10 rounded-full bg-surface-inset border border-border flex items-center justify-center text-[#ff385c]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-ink">
                    {section.title}
                  </h2>
                </div>

                {section.content}
              </section>
            );
          })}
        </div>

        {/* Glossary Link Banner */}
        <div className="mt-12 p-6 rounded-[14px] bg-rausch-bg border border-rausch-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[#ff385c]">
              Domain Vocabulary &amp; Standards
            </h3>
            <p className="text-xs text-ink mt-0.5">
              Read our full glossary for strict domain language and ADR decisions.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-xs font-semibold text-white transition-all shadow-sm shrink-0"
          >
            View Onboarding Guide &rarr;
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
