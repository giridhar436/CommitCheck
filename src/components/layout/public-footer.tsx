import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-[#dddddd] bg-white text-xs text-[#6a6a6a]">
      {/* Top Footer Navigation Columns */}
      <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#222222] mb-3">
            Product & Guides
          </h4>
          <ul className="space-y-2.5">
            <li>
              <Link href="/docs" className="hover:text-[#222222] hover:underline">
                Documentation & Specs
              </Link>
            </li>
            <li>
              <Link href="/onboarding" className="hover:text-[#222222] hover:underline">
                Onboarding Walkthrough
              </Link>
            </li>
            <li>
              <Link href="/support" className="hover:text-[#222222] hover:underline">
                Support & Diagnostics
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-[#222222] hover:underline">
                Dual Role Portal
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#222222] mb-3">
            Trust & Security
          </h4>
          <ul className="space-y-2.5">
            <li>
              <Link href="/security" className="hover:text-[#222222] hover:underline">
                Security Architecture
              </Link>
            </li>
            <li>
              <Link href="/security#disclosure" className="hover:text-[#222222] hover:underline">
                Responsible Disclosure
              </Link>
            </li>
            <li>
              <Link href="/dpa" className="hover:text-[#222222] hover:underline">
                Data Processing Agreement
              </Link>
            </li>
            <li>
              <Link href="/accessibility" className="hover:text-[#222222] hover:underline">
                Accessibility Statement
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#222222] mb-3">
            Legal & Policies
          </h4>
          <ul className="space-y-2.5">
            <li>
              <Link href="/privacy" className="hover:text-[#222222] hover:underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-[#222222] hover:underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="hover:text-[#222222] hover:underline">
                Cookie Policy
              </Link>
            </li>
            <li>
              <Link href="/acceptable-use" className="hover:text-[#222222] hover:underline">
                Acceptable Use Policy
              </Link>
            </li>
            <li>
              <Link href="/disclaimer" className="hover:text-[#222222] hover:underline">
                AI & Audit Disclaimer
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#222222] mb-3">
            Platform Integrations
          </h4>
          <p className="text-xs text-[#6a6a6a] leading-relaxed mb-3">
            Autonomous Google Meet bot diarization via Recall.ai, Linear issue sync, and GitHub AST & semantic commit verification via Gemini.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-[11px] font-medium text-[#222222]">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            All Systems Operational
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#f7f7f7] py-6">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-[#222222]">CommitCheck</span>
            <span>&copy; {new Date().getFullYear()} CommitCheck. Meeting-to-Code Freelance Verification.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Link href="/privacy" className="hover:text-[#222222]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#222222]">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-[#222222]">
              Cookies
            </Link>
            <Link href="/security" className="hover:text-[#222222]">
              Security
            </Link>
            <Link href="/support" className="hover:text-[#222222]">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
