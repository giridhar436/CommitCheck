import Link from "next/link";
import { ShieldCheck, Compass, ArrowRight, Home, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#dddddd] bg-white">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-[#222222]">CommitCheck</span>
              <span className="text-[11px] font-medium text-[#6a6a6a] tracking-wider uppercase -mt-1">
                Meeting-to-Code Verification
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#dddddd] text-[#222222] hover:bg-[#f7f7f7] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main 404 Body */}
      <main className="max-w-2xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-[#fff0f3] text-[#ff385c] border border-[#ffd1da] flex items-center justify-center mb-6 airbnb-shadow">
          <Compass className="w-10 h-10 animate-spin-slow" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f7f7f7] text-[#6a6a6a] border border-[#dddddd] mb-3">
          Error 404 &bull; Page Not Found
        </span>

        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-3">
          We can&apos;t seem to find the page you&apos;re looking for.
        </h1>

        <p className="text-base text-[#6a6a6a] max-w-lg mb-8 leading-relaxed">
          The link you clicked may be broken, the project may have been moved, or you might not have entered the correct workspace URL.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:ring-offset-2"
          >
            <Home className="w-4 h-4" />
            Go to Homepage
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#222222]"
          >
            <HelpCircle className="w-4 h-4 text-[#6a6a6a]" />
            Help & FAQs
          </Link>
        </div>

        {/* Helpful Shortcut Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 w-full text-left">
          <Link
            href="/freelancer"
            className="p-5 rounded-[14px] border border-[#dddddd] bg-white hover:border-[#222222] airbnb-shadow-hover transition-all group"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a] mb-1">
              For Freelancers
            </div>
            <div className="text-sm font-semibold text-[#222222] flex items-center justify-between">
              Freelancer Workspace
              <ArrowRight className="w-4 h-4 text-[#6a6a6a] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-[#6a6a6a] mt-1">
              Access your project staging, bot dispatch, and Linear sync.
            </p>
          </Link>

          <Link
            href="/client"
            className="p-5 rounded-[14px] border border-[#dddddd] bg-white hover:border-[#ff385c] airbnb-shadow-hover transition-all group"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[#ff385c] mb-1">
              For Clients
            </div>
            <div className="text-sm font-semibold text-[#222222] flex items-center justify-between">
              Client Audit Portal
              <ArrowRight className="w-4 h-4 text-[#ff385c] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-[#6a6a6a] mt-1">
              Review code verification reports and sign off milestones.
            </p>
          </Link>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-[#dddddd] py-6 text-center text-xs text-[#6a6a6a]">
        CommitCheck &bull; Meeting-to-Code Verification Platform
      </footer>
    </div>
  );
}
