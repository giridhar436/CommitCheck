"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, ShieldCheck, ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getServerSnapshot() {
  return true;
}

export default function OfflinePage() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [retrying, setRetrying] = useState(false);

  // Automatically attempt reload when connectivity returns
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#222222] flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#dddddd] px-6 py-4 bg-[#ffffff]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#ff385c] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-[#222222]">
                CommitCheck
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-[#6a6a6a]">
                Offline Mode
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#f7f7f7] border border-[#dddddd] text-[#6a6a6a]">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-[#c13515]"
              }`}
            />
            {isOnline ? "Reconnecting..." : "Offline"}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#f7f7f7] border border-[#dddddd] flex items-center justify-center mb-6 text-[#222222] shadow-xs">
          <WifiOff className="w-8 h-8 text-[#6a6a6a]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#222222] mb-3">
          {isOnline ? "Connection Restored!" : "You are currently offline"}
        </h1>

        <p className="text-sm sm:text-base text-[#6a6a6a] max-w-md mb-8 leading-relaxed">
          {isOnline
            ? "Your internet connection is back. Reconnecting to CommitCheck services now..."
            : "CommitCheck requires an internet connection to sync Google Meet transcripts, query Linear tasks, and verify GitHub commits."}
        </p>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mb-10">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[8px] bg-[#ff385c] text-white font-medium text-sm hover:bg-[#e00b41] active:scale-[0.99] transition-all shadow-xs disabled:opacity-70 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`}
            />
            {retrying ? "Checking connection..." : "Retry Connection"}
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] bg-[#f7f7f7] hover:bg-[#ebebeb] text-[#222222] border border-[#dddddd] font-medium text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Informational Cards */}
        <div className="w-full text-left bg-[#f7f7f7] border border-[#dddddd] rounded-[14px] p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
            Offline Availability
          </h2>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#ffffff] border border-[#dddddd] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs">✓</span>
            </div>
            <div className="text-xs">
              <p className="font-medium text-[#222222]">Cached Application Shell</p>
              <p className="text-[#6a6a6a] mt-0.5">
                The interface shell and documentation are safely cached on this device for offline reference.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[#ffffff] border border-[#dddddd] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-[#c13515]">✕</span>
            </div>
            <div className="text-xs">
              <p className="font-medium text-[#222222]">Live Verification & Audit Services</p>
              <p className="text-[#6a6a6a] mt-0.5">
                Google Meet bots, Gemini AI scope extraction, Linear syncing, and GitHub commit audits are paused until connection returns.
              </p>
            </div>
          </div>
        </div>

        {/* Helpful links */}
        <div className="mt-8 flex items-center gap-4 text-xs text-[#6a6a6a]">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 hover:text-[#222222] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Cached Documentation
          </Link>
          <span>•</span>
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 hover:text-[#222222] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Support Info
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#dddddd] px-6 py-4 text-center text-xs text-[#6a6a6a] bg-[#ffffff]">
        CommitCheck • Meeting-to-Code Freelance Verification
      </footer>
    </div>
  );
}
