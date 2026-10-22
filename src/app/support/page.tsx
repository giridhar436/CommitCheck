import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import {
  HelpCircle,
  Video,
  GitBranch,
  Layers,
  ShieldCheck,
  Activity,
  Mail,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function SupportPage() {
  const faqs = [
    {
      category: "Google Meet Bot Dispatch",
      icon: Video,
      items: [
        {
          q: "Why did the meeting bot fail to join my Google Meet call?",
          a: "The meeting bot requires a valid Google Meet URL matching the format `https://meet.google.com/xxx-yyyy-zzz`. Ensure that your Google Meet call host has disabled 'Quick Access' locks or permits external guests, and verify that the meeting has not already ended.",
        },
        {
          q: "How long does transcription take after the call ends?",
          a: "Recall.ai automatically uploads and diarizes the audio transcript once the call disconnects. In normal conditions, the diarized transcript artifact is fetched and staged within 60 to 120 seconds.",
        },
      ],
    },
    {
      category: "GitHub Repository Binding",
      icon: GitBranch,
      items: [
        {
          q: "Why can't I find or select my GitHub repository?",
          a: "CommitCheck requests `read:user user:email repo` OAuth scopes. Ensure that the authenticated GitHub account has at least read/pull access to the target repository. If the repository belongs to an organization, verify that OAuth App access has been granted by the organization owner.",
        },
        {
          q: "Does CommitCheck write code or merge pull requests?",
          a: "No. CommitCheck is strictly an audit and verification platform. It operates in read-only mode regarding your source code and never automatically merges branches, amends commits, or modifies files.",
        },
      ],
    },
    {
      category: "Linear Workspace Synchronization",
      icon: Layers,
      items: [
        {
          q: "What tasks are synced to Linear?",
          a: "Only Explicit Requirements and Confirmed Commitments are synced initially to Linear. AI-Inferred and Tentative requirements remain held in staging until the Client approves them via the Scope Confirmation loop.",
        },
        {
          q: "Can I disconnect or change my Linear workspace?",
          a: "Yes. Freelancers can disconnect and reconnect their Linear organization at any time in Freelancer Workspace Settings.",
        },
      ],
    },
    {
      category: "AI Code Audits & Discrepancies",
      icon: ShieldCheck,
      items: [
        {
          q: "What causes a Ghost Completion flag?",
          a: "A Ghost Completion is flagged when a task is marked 'Done' in Linear, but our dual-tier audit finds neither syntactic ticket key references (e.g. `VAR-101`) in commit messages/branches, nor semantic code implementation in git diffs.",
        },
        {
          q: "Why did 'Verify Progress' return the previous report immediately?",
          a: "To prevent redundant LLM token spend, CommitCheck enforces a 10-minute cache cooldown if the bound repository has no new commit SHAs since the last audit run.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-[#ff385c]" />
            Support & Knowledge Center
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-4">
            How can we help you?
          </h1>
          <p className="text-base text-[#6a6a6a] leading-relaxed">
            Find technical troubleshooting guides, system health checks, and verified support channels for CommitCheck&apos;s meeting bot, Linear sync, and code auditing tools.
          </p>
        </div>

        {/* Quick Diagnostic Status Bar */}
        <div className="p-5 rounded-[14px] bg-[#f7f7f7] border border-[#dddddd] mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#dddddd] flex items-center justify-center text-emerald-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">System Health</span>
              <p className="text-sm font-semibold text-[#222222]">All verification engines operational</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#ebebeb] text-xs font-medium text-[#222222] transition-colors"
            >
              Live Health JSON
              <ExternalLink className="w-3 h-3 text-[#6a6a6a]" />
            </a>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-xs font-semibold text-white transition-colors"
            >
              Read Docs
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* FAQ Grid */}
        <div className="space-y-10 mb-16">
          <h2 className="text-xl font-semibold text-[#222222]">
            Frequently Asked Questions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.category}
                  className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover"
                >
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#f7f7f7]">
                    <div className="w-8 h-8 rounded-full bg-[#f7f7f7] border border-[#dddddd] flex items-center justify-center text-[#ff385c]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-semibold text-[#222222]">
                      {category.category}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {category.items.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <h4 className="text-xs font-semibold text-[#222222]">
                          {item.q}
                        </h4>
                        <p className="text-xs text-[#6a6a6a] leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Contact Channels */}
        <section aria-labelledby="contact-channels" className="p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow">
          <h2 id="contact-channels" className="text-xl font-semibold text-[#222222] mb-2">
            Contact Support & Triage
          </h2>
          <p className="text-xs text-[#6a6a6a] mb-6 leading-relaxed">
            Can&apos;t resolve an integration issue? Our core engineering team reviews diagnostic logs and API trace correlations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-[10px] bg-[#f7f7f7] border border-[#dddddd]">
              <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-[#222222]">
                <Mail className="w-4 h-4 text-[#ff385c]" />
                Email Support Inbox
              </div>
              <p className="text-xs text-[#6a6a6a] mb-2">
                For account verification, data requests, or integration timeouts:
              </p>
              <a
                href="mailto:support@commitcheck.dev"
                className="text-xs font-medium text-[#ff385c] hover:underline"
              >
                support@commitcheck.dev
              </a>
            </div>

            <div className="p-4 rounded-[10px] bg-[#f7f7f7] border border-[#dddddd]">
              <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-[#222222]">
                <ShieldCheck className="w-4 h-4 text-[#222222]" />
                Security & Vulnerability Triage
              </div>
              <p className="text-xs text-[#6a6a6a] mb-2">
                For security disclosures and confidential vulnerability reports:
              </p>
              <Link
                href="/security#disclosure"
                className="text-xs font-medium text-[#222222] hover:underline"
              >
                View Responsible Disclosure Policy &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
