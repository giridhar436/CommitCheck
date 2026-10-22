import Link from "next/link";
import { Wrench, ShieldCheck, RefreshCw, Mail } from "lucide-react";

export default function MaintenancePage() {
  const isMaintenanceActive = process.env.MAINTENANCE_MODE === "true";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#dddddd] bg-white">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-[#222222]">CommitCheck</span>
              <span className="text-[11px] font-medium text-[#6a6a6a] tracking-wider uppercase -mt-1">
                System Upgrade
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-[#6a6a6a] uppercase tracking-wider">
              {isMaintenanceActive ? "Maintenance Active" : "Operational"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Maintenance Box */}
      <main className="max-w-xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-[#fff8e6] text-[#b45309] border border-[#fde68a] flex items-center justify-center mb-6 airbnb-shadow">
          <Wrench className="w-8 h-8" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#92400e] border border-[#fde68a] mb-3">
          Scheduled Platform Maintenance
        </span>

        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#222222] mb-3">
          We&apos;re upgrading CommitCheck infrastructure
        </h1>

        <p className="text-sm text-[#6a6a6a] max-w-md mb-8 leading-relaxed">
          We are currently deploying database schema optimizations and AI verification enhancements.
          Ongoing meeting bot recordings and git commit webhooks will resume processing automatically once upgrades complete.
        </p>

        {/* Status Details */}
        <div className="w-full text-left p-5 rounded-[14px] bg-[#f7f7f7] border border-[#dddddd] mb-8 space-y-2.5 text-xs text-[#3f3f3f]">
          <div className="flex items-center justify-between pb-2 border-b border-[#dddddd]">
            <span className="font-semibold">PostgreSQL Database:</span>
            <span className="text-amber-700 font-medium">Migration in progress</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-[#dddddd]">
            <span className="font-semibold">Recall.ai Webhook Queue:</span>
            <span className="text-emerald-700 font-medium">Buffering events safely</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Audit Engine:</span>
            <span className="text-[#6a6a6a]">Temporarily paused</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xs">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4" />
            Check Again
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] font-medium text-sm transition-all"
          >
            <Mail className="w-4 h-4 text-[#6a6a6a]" />
            Support
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#dddddd] py-6 text-center text-xs text-[#6a6a6a]">
        CommitCheck &bull; Meeting-to-Code Verification Platform
      </footer>
    </div>
  );
}
