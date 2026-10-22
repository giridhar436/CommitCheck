import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { ShieldCheck, Lock, KeyRound, AlertCircle, FileCheck, Mail } from "lucide-react";

export default function SecurityPolicyPage() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#ff385c]" />
            Security & Trust Architecture
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-2">
            Security Policy & Responsible Disclosure
          </h1>
          <p className="text-xs text-[#6a6a6a]">
            Effective Date: {lastUpdated} &bull; Security Standard 1.0
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-sm text-[#3f3f3f] leading-relaxed">
          {/* Section 1: Overview */}
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7]">
            <h2 className="text-base font-semibold text-[#222222] mb-2">
              1. Security Commitment
            </h2>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              At CommitCheck, security is an architectural requirement, not an afterthought. We handle sensitive developer credentials, private repository metadata, and verbal discovery call transcripts. We design our systems around strict least-privilege scoping, cryptographic session signing, and end-to-end transport encryption.
            </p>
          </section>

          {/* Section 2: Technical Safeguards */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              2. Technical & Architectural Safeguards
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#222222] mb-1.5">
                  <KeyRound className="w-4 h-4 text-[#ff385c]" />
                  Cryptographic Session Integrity
                </div>
                <p className="text-xs text-[#6a6a6a] leading-relaxed">
                  Sessions are sealed with HMAC-SHA256 signatures using an isolated server-side <code>AUTH_SECRET</code>. Tokens are stored in HttpOnly, SameSite=Lax cookies that are inaccessible to client-side JavaScript.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#222222] mb-1.5">
                  <Lock className="w-4 h-4 text-[#ff385c]" />
                  Least-Privilege GitHub Scopes
                </div>
                <p className="text-xs text-[#6a6a6a] leading-relaxed">
                  CommitCheck requests minimal repository read scopes (<code>repo</code> and <code>read:user</code>) necessary to fetch commit SHAs and diff chunks. We never request write permissions to alter branch trees or commit code.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#222222] mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#ff385c]" />
                  Svix Webhook Verification
                </div>
                <p className="text-xs text-[#6a6a6a] leading-relaxed">
                  Recall.ai bot transcripts and status webhooks are authenticated via Svix cryptographic signatures (<code>webhook-signature</code> headers), ensuring that falsified payloads are rejected at the edge.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#222222] mb-1.5">
                  <FileCheck className="w-4 h-4 text-[#ff385c]" />
                  Secret Masking in Logging
                </div>
                <p className="text-xs text-[#6a6a6a] leading-relaxed">
                  All environmental validation diagnostics automatically mask API keys and connection URIs, retaining only safe prefixes and suffixes to prevent credential leakage in application telemetry.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Responsible Disclosure */}
          <section id="disclosure" className="p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 pb-3 border-b border-[#f7f7f7]">
              <div className="w-8 h-8 rounded-full bg-[#fff0f3] text-[#ff385c] flex items-center justify-center font-bold">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
                  Security Researchers
                </span>
                <h2 className="text-lg font-semibold text-[#222222]">
                  Responsible Vulnerability Disclosure Program
                </h2>
              </div>
            </div>

            <p className="text-xs text-[#3f3f3f] leading-relaxed">
              We welcome reports from security researchers and the developer community. If you believe you have discovered a security vulnerability in CommitCheck, please report it to us responsibly according to the guidelines below:
            </p>

            <div className="space-y-3 text-xs text-[#3f3f3f]">
              <div className="p-3.5 rounded-[8px] bg-[#f7f7f7] border border-[#dddddd]">
                <strong className="text-[#222222] block mb-1">Safe Harbor Guidelines:</strong>
                <ul className="list-disc list-inside space-y-1 text-[#6a6a6a]">
                  <li>Provide details of the vulnerability, including reproducible proof-of-concept steps.</li>
                  <li>Do not access, modify, or destroy user data or private repositories.</li>
                  <li>Do not execute denial of service (DoS/DDoS) attacks against production infrastructure.</li>
                  <li>Give our security team reasonable time to triage and patch the issue prior to public disclosure.</li>
                </ul>
              </div>

              <div className="flex items-center justify-between p-4 rounded-[8px] bg-[#fff0f3] border border-[#ffd1da]">
                <div>
                  <span className="font-semibold text-xs text-[#222222] block">
                    Security Reporting Contact
                  </span>
                  <span className="text-xs text-[#6a6a6a]">
                    Send encrypted reports to our dedicated triage inbox:
                  </span>
                </div>
                <a
                  href="mailto:security@commitcheck.dev"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#222222] text-white hover:bg-black text-xs font-semibold transition-colors shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  security@commitcheck.dev
                </a>
              </div>
            </div>

            <p className="text-xs text-[#6a6a6a]">
              We commit to acknowledging received reports within <strong>48 hours</strong> and providing status updates throughout the remediation cycle.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
