import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { FileText, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function TermsOfServicePage() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <FileText className="w-3.5 h-3.5 text-[#ff385c]" />
            Legal Agreement
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-2">
            Terms of Service
          </h1>
          <p className="text-xs text-[#6a6a6a]">
            Effective Date: {lastUpdated} &bull; Version 1.0 (Meeting-to-Code Platform)
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-sm text-[#3f3f3f] leading-relaxed">
          {/* Section 1 */}
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7]">
            <h2 className="text-base font-semibold text-[#222222] mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using CommitCheck (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company, startup, or other legal entity, you represent that you have the authority to bind such entity to these terms.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              2. Dual-Role Architecture & User Obligations
            </h2>
            <p>
              CommitCheck partitions user workflows by role under <strong>ADR 0001</strong>:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs text-[#3f3f3f]">
              <li>
                <strong>Freelancer Accounts:</strong> Authenticated exclusively via GitHub OAuth. You warrant that you hold legitimate development authorization or ownership over repositories you link to CommitCheck projects.
              </li>
              <li>
                <strong>Client Accounts:</strong> Authenticated exclusively via Google OAuth. You warrant that you are authorized to review deliverables, sign off on project scopes, and audit associated code repositories.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              3. Meeting Recording Bot Consent & Authorization
            </h2>
            <div className="p-4 rounded-[10px] bg-[#fff8e6] border border-[#fde68a] text-xs text-[#78350f]">
              <strong>Critical Recording Notice:</strong> When you provide a Google Meet URL to dispatch a Recall.ai meeting bot, you explicitly warrant that you have provided prior notice to and obtained all legally necessary consents from all meeting participants in compliance with applicable recording laws (including single-party or all-party wiretapping and privacy statutes).
            </div>
            <p className="text-xs text-[#3f3f3f]">
              You agree not to dispatch the meeting bot to any meeting, classroom, consultation, or conference where recording is restricted, prohibited, or unauthorized.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              4. Codebase Read Access & Read-Only Guarantee
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              To perform progress audits and calculate Verified Completion percentages:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[#3f3f3f]">
              <li>You grant CommitCheck read-only permission to query git commit messages, branch references, and pull request diffs via the GitHub API.</li>
              <li>CommitCheck guarantees that it will never automatically merge branches, push commits, delete repositories, or alter source files without explicit manual developer action.</li>
              <li>You retain 100% intellectual property ownership of your source code and documentation.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              5. AI Scope Extraction & Advisory Audit Disclaimers
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              CommitCheck utilizes large language models (Google Gemini 1.5 Pro) to assist in scoping and auditing:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[#3f3f3f]">
              <li><strong>Pre-Publish Review Gate:</strong> Extracted deliverables are suggestions staged for review. The Freelancer must review, adjust, and approve items before publishing to Linear.</li>
              <li><strong>Scope Confirmation:</strong> Inferred and tentative items require Client approval before entering approved scope.</li>
              <li><strong>Audit Scores:</strong> Verification scores and Ghost Completion flags are automated heuristics. They do not replace professional code review, QA testing, or legal contract compliance.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              6. Limitation of Liability
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              To the maximum extent permitted by law, CommitCheck and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, code integrity, or business opportunities arising from meeting transcription inaccuracies, LLM misclassifications, or third-party service outages (Recall.ai, GitHub, Linear, Google Cloud).
            </p>
          </section>

          {/* Section 7 */}
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">
              7. Contact & Notices
            </h2>
            <p className="text-xs text-[#6a6a6a]">
              Formal legal notices and questions regarding these Terms of Service should be directed to{" "}
              <a href="mailto:support@commitcheck.dev" className="text-[#ff385c] font-medium underline">
                support@commitcheck.dev
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
