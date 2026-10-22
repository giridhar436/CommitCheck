import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { ShieldAlert, Ban, CheckCircle2 } from "lucide-react";

export default function AcceptableUsePolicyPage() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-[#ff385c]" />
            Platform Integrity Standards
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-2">
            Acceptable Use Policy
          </h1>
          <p className="text-xs text-[#6a6a6a]">
            Effective Date: {lastUpdated} &bull; Version 1.0
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm text-[#3f3f3f] leading-relaxed">
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7]">
            <h2 className="text-base font-semibold text-[#222222] mb-2">
              1. Policy Overview
            </h2>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              This Acceptable Use Policy outlines prohibited conduct on CommitCheck. We maintain these standards to safeguard our meeting bot infrastructure, protect developer repositories from unauthorized scanning, and preserve authentic delivery transparency between freelancers and clients.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              2. Prohibited Activities
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-[10px] border border-[#fbd5cb] bg-[#fff8f6]">
                <strong className="text-[#c13515] block mb-1">A. Unauthorized Meeting Bot Dispatch</strong>
                <p className="text-[#3f3f3f]">
                  You may not dispatch a meeting bot into any Google Meet room without the prior notice and consent of all participating attendees, or into virtual classrooms, hearings, or private personal calls where commercial recording is unlawful.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#fbd5cb] bg-[#fff8f6]">
                <strong className="text-[#c13515] block mb-1">B. Malicious Repositories & Exploits</strong>
                <p className="text-[#3f3f3f]">
                  You may not bind CommitCheck to repositories containing malware, spyware, ransomware, keyloggers, or code designed to attack, exploit, or compromise computer systems or cloud services.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#fbd5cb] bg-[#fff8f6]">
                <strong className="text-[#c13515] block mb-1">C. Falsification of Delivery Audits</strong>
                <p className="text-[#3f3f3f]">
                  You may not manipulate commit SHAs, spoof author signatures, or artificially fabricate commit messages to deceive clients or manipulate the AI Verified Completion score.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#fbd5cb] bg-[#fff8f6]">
                <strong className="text-[#c13515] block mb-1">D. API Flooding & Denial of Service</strong>
                <p className="text-[#3f3f3f]">
                  You may not automate excessive, abusive requests against our Recall.ai bot webhook endpoints, Gemini extraction pipelines, or GitHub querying adapters beyond reasonable development and audit usage.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              3. Enforcement & Account Suspension
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              Violations of this policy may result in immediate revocation of OAuth session tokens, termination of linked projects, and permanent banning of associated GitHub or Google accounts.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
