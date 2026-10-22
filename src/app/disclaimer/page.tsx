import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { AlertTriangle } from "lucide-react";

export default function DisclaimerPage() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ff385c]" />
            Regulatory & Technical Boundaries
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-2">
            AI & Code Audit Disclaimer
          </h1>
          <p className="text-xs text-[#6a6a6a]">
            Effective Date: {lastUpdated} &bull; Version 1.0 (Meeting-to-Code Platform)
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm text-[#3f3f3f] leading-relaxed">
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7]">
            <h2 className="text-base font-semibold text-[#222222] mb-2">
              1. General Disclaimer
            </h2>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              CommitCheck provides automated software tools to assist in tracking freelance commitments, transcribing virtual discovery calls, and evaluating codebase delivery against task boards. The platform is designed solely as an operational and project management aid.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              2. Probabilistic Nature of AI Models (Google Gemini 1.5 Pro)
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              CommitCheck integrates large language models (LLMs) via the Google GenAI SDK for two primary workflows:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[#3f3f3f]">
              <li><strong>Transcript Scope Extraction:</strong> Decomposing verbal conversations into milestones, acceptance criteria, and task classifications.</li>
              <li><strong>Semantic Git Diff Auditing:</strong> Evaluating commit diff chunks against Linear issue descriptions.</li>
            </ul>
            <div className="p-4 rounded-[10px] bg-[#fff8e6] border border-[#fde68a] text-xs text-[#78350f]">
              <strong>Advisory Nature of LLM Outputs:</strong> LLM outputs are inherently probabilistic and may occasionally misinterpret audio context, generate inaccurate estimates, or mischaracterize code changes. All AI-generated deliverables are staged in review interfaces and require human verification before synchronization or milestone sign-off.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              3. Code Verification Heuristics & No Warranty of Quality
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              The Verified Completion score and discrepancy flags (including Ghost Completions and Untracked Commits) indicate whether git commits reference or semantically align with task tickets. They do <strong>not</strong> certify:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[#3f3f3f]">
              <li>That the code is free of bugs, security vulnerabilities, or performance bottlenecks.</li>
              <li>That the code meets industry compliance standards or commercial viability.</li>
              <li>That automated unit, integration, or end-to-end tests have passed in the developer&apos;s environment.</li>
            </ul>
            <p className="text-xs text-[#6a6a6a]">
              Clients should continue to perform standard code reviews, QA testing, and staging environment verification prior to releasing project milestones.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              4. No Legal or Financial Advice
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              CommitCheck does not provide legal, contract, escrow, or dispute resolution services. The classification of items into &ldquo;Explicit&rdquo; or &ldquo;Tentative&rdquo; requirements does not constitute a legally binding statement of work (SOW) unless formally incorporated into an executed contract between Freelancer and Client.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
