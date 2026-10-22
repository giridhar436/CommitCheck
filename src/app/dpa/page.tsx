import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { FileCheck } from "lucide-react";

export default function DataProcessingAgreementPage() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <FileCheck className="w-3.5 h-3.5 text-[#ff385c]" />
            Enterprise & Business Terms
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-2">
            Data Processing Agreement (DPA)
          </h1>
          <p className="text-xs text-[#6a6a6a]">
            Effective Date: {lastUpdated} &bull; Standard Contractual Data Processing Framework
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm text-[#3f3f3f] leading-relaxed">
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7]">
            <h2 className="text-base font-semibold text-[#222222] mb-2">
              1. Scope & Applicability
            </h2>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              This Data Processing Agreement (&ldquo;DPA&rdquo;) applies to the processing of personal and project data by CommitCheck on behalf of business customers, agencies, and freelance developers (&ldquo;Customer&rdquo; or &ldquo;Data Controller&rdquo;) who use our meeting transcription, task staging, and codebase audit services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              2. Roles & Processing Instructions
            </h2>
            <ul className="list-disc list-inside space-y-2 text-xs text-[#3f3f3f]">
              <li>
                <strong>Customer as Data Controller:</strong> Customer determines the purposes and means of processing meeting audio, Google Meet recordings, Linear tickets, and git repository contents.
              </li>
              <li>
                <strong>CommitCheck as Data Processor:</strong> CommitCheck processes Customer data solely in accordance with Customer&apos;s documented instructions, including dispatching meeting bots, executing Gemini AI extraction prompts, and evaluating git commit diffs.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              3. Authorized Sub-processors
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              Customer authorizes CommitCheck to engage the following infrastructure sub-processors:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-[8px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block">Supabase Inc.</strong>
                <span className="text-[#6a6a6a]">Managed PostgreSQL cloud database hosting.</span>
              </div>
              <div className="p-3 rounded-[8px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block">Google Cloud Platform (Gemini API)</strong>
                <span className="text-[#6a6a6a]">AI language model extraction and code diff evaluation.</span>
              </div>
              <div className="p-3 rounded-[8px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block">Recall.ai Inc.</strong>
                <span className="text-[#6a6a6a]">Google Meet bot recording and speech diarization.</span>
              </div>
              <div className="p-3 rounded-[8px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block">Resend Inc.</strong>
                <span className="text-[#6a6a6a]">Transactional email delivery infrastructure.</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              4. Data Subject Rights & Deletion
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              CommitCheck provides built-in tools within the application enabling Customer to fulfill data subject requests:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[#3f3f3f]">
              <li><strong>Portability:</strong> Instant JSON export of all projects, meeting transcripts, and audit reports via <code>/api/account/export</code>.</li>
              <li><strong>Erasure:</strong> Permanent cascading deletion of account records and associated data via <code>/api/account/delete</code>.</li>
            </ul>
          </section>

          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">
              5. Inquiries & Custom DPA Execution
            </h2>
            <p className="text-xs text-[#6a6a6a]">
              For custom enterprise DPA countersignatures or standard contractual clause (SCC) inquiries, contact{" "}
              <a href="mailto:privacy@commitcheck.dev" className="text-[#ff385c] font-medium underline">
                privacy@commitcheck.dev
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
