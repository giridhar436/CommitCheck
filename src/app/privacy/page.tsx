import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { ShieldCheck, Lock, Database, UserCheck, Trash2, Download } from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <Lock className="w-3.5 h-3.5 text-[#ff385c]" />
            Privacy & Data Practices
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#6a6a6a]">
            Effective Date: {lastUpdated} &bull; Version 1.0 (Meeting-to-Code Platform)
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-sm text-[#3f3f3f] leading-relaxed">
          {/* Section 1: Overview */}
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7]">
            <h2 className="text-base font-semibold text-[#222222] mb-2">
              1. Introduction & Verified Data Architecture
            </h2>
            <p>
              CommitCheck (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;) provides automated meeting transcription, task staging, and codebase audit verification for freelance engagements. We believe in strict data minimization: we collect only data essential to operate our Google Meet bot, Linear task synchronization, and GitHub commit verification features.
            </p>
          </section>

          {/* Section 2: Data We Collect */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              2. Data We Collect & Collection Methods
            </h2>
            <p>
              Our system captures data through direct user action, authorized third-party OAuth providers, and automated meeting bots:
            </p>

            <div className="space-y-3">
              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block mb-1">A. Account & Identity Data</strong>
                <p className="text-xs text-[#6a6a6a]">
                  When you authenticate via <strong>GitHub OAuth</strong> (Freelancer) or <strong>Google OAuth</strong> (Client), we collect your name, email address, avatar URL, provider account ID, and GitHub username. We do not collect or store passwords.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block mb-1">B. Meeting URLs & Audio Transcripts</strong>
                <p className="text-xs text-[#6a6a6a]">
                  When a Freelancer inputs a Google Meet URL, our bot provider (Recall.ai) joins the call to record and transcribe participant speech. We store the diarized transcript text, speaker timestamps, and AI-extracted deliverable summaries in our PostgreSQL database.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block mb-1">C. Repository Metadata & Git Commits</strong>
                <p className="text-xs text-[#6a6a6a]">
                  To audit progress, our audit engine queries the user-authorized GitHub repository to read commit hashes, commit messages, author metadata, branch names, and pull request diff chunks. We do not modify or execute repository code.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block mb-1">D. Linear Project & Task Records</strong>
                <p className="text-xs text-[#6a6a6a]">
                  When connected via OAuth, we access your Linear workspace ID and issue tracker to publish agreed deliverable drafts and cross-reference task completion status against GitHub activity.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Purposes */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              3. Purpose of Processing
            </h2>
            <p>We process your data strictly to execute the following core capabilities:</p>
            <ul className="list-disc list-inside space-y-2 text-xs text-[#3f3f3f]">
              <li><strong>Session Authentication:</strong> Authenticating users and enforcing role boundaries (Freelancer vs Client).</li>
              <li><strong>Scope Extraction:</strong> Running Google Gemini 1.5 Pro to decompose transcripts into Explicit, Confirmed, AI-Inferred, and Tentative deliverables.</li>
              <li><strong>Stakeholder Communication:</strong> Dispatching scope confirmation requests and project summaries to client emails via Resend.</li>
              <li><strong>Continuous Delivery Verification:</strong> Inspecting git commit history to detect completed tasks, untracked commits, and Ghost Completions.</li>
            </ul>
          </section>

          {/* Section 4: Sub-processors */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              4. Third-Party Service Providers & Sub-processors
            </h2>
            <p className="text-xs text-[#6a6a6a]">
              We share data with the following infrastructure providers solely to provide our platform functionality:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-[8px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block">Supabase (PostgreSQL)</strong>
                <span className="text-[#6a6a6a]">Primary relational database for user identities, projects, transcripts, and audit reports.</span>
              </div>
              <div className="p-3.5 rounded-[8px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block">Google Gemini (GenAI API)</strong>
                <span className="text-[#6a6a6a]">LLM processing for 4-tier transcript classification and semantic git diff evaluations.</span>
              </div>
              <div className="p-3.5 rounded-[8px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block">Recall.ai</strong>
                <span className="text-[#6a6a6a]">Managed Google Meet bot infrastructure and diarized speech-to-text processing.</span>
              </div>
              <div className="p-3.5 rounded-[8px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block">Resend</strong>
                <span className="text-[#6a6a6a]">Transactional email dispatch for client scope confirmations and Linear project notices.</span>
              </div>
            </div>
          </section>

          {/* Section 5: Cookies */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              5. Cookies & Tracking Technologies
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              CommitCheck uses only strictly necessary first-party cookies:
            </p>
            <div className="p-4 rounded-[8px] bg-[#f7f7f7] border border-[#dddddd] text-xs space-y-1">
              <p><strong>Name:</strong> <code>cc_session</code></p>
              <p><strong>Purpose:</strong> HMAC-signed session authentication and role persistence.</p>
              <p><strong>Duration:</strong> 7 days from last sign-in.</p>
              <p><strong>Attributes:</strong> HttpOnly, SameSite=Lax, Secure (in production).</p>
            </div>
            <p className="text-xs text-[#6a6a6a]">
              We do not employ third-party advertising cookies, cross-site trackers, or behavioral profiling scripts.
            </p>
          </section>

          {/* Section 6: User Choices and Rights */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              6. Your Rights & Data Controls
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              You maintain complete control over the data stored in CommitCheck:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-xs text-[#222222] mb-1">
                    <Download className="w-4 h-4 text-[#ff385c]" />
                    Data Export (Portability)
                  </div>
                  <p className="text-xs text-[#6a6a6a]">
                    You can download a complete JSON archive of your projects, meetings, staged tasks, and audit reports directly from your workspace settings.
                  </p>
                </div>
                <a
                  href="/api/account/export"
                  download
                  className="mt-3 text-xs font-semibold text-[#ff385c] hover:underline"
                >
                  Download Data Archive &rarr;
                </a>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-xs text-[#c13515] mb-1">
                    <Trash2 className="w-4 h-4 text-[#c13515]" />
                    Account & Data Erasure
                  </div>
                  <p className="text-xs text-[#6a6a6a]">
                    You can permanently erase your profile and cascade-delete all owned projects, transcripts, and audit reports from Workspace Settings.
                  </p>
                </div>
                <span className="mt-3 text-xs font-semibold text-[#c13515]">
                  Actionable in Workspace Settings
                </span>
              </div>
            </div>
          </section>

          {/* Section 7: Security & Storage */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              7. Data Retention & Security Limitations
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              We retain project and meeting data for the duration of the active workspace or until deleted by the user. Audit reports remain immutable snapshots. All data in transit is encrypted using TLS 1.3, and all external webhooks are verified cryptographically. While we employ rigorous architectural controls, no web transmission method is 100% immune from compromise.
            </p>
          </section>

          {/* Section 8: Children's Privacy */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              8. Age Restrictions
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              CommitCheck is intended exclusively for business, professional freelance, and software engineering use. We do not knowingly collect personal information from individuals under the age of 18.
            </p>
          </section>

          {/* Section 9: Contact */}
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">
              9. Privacy Questions & Data Requests
            </h2>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              If you have questions about our data practices or wish to exercise your data subject rights, contact our privacy engineering team at{" "}
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
