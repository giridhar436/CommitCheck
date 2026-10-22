"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log safe error detail internally without exposing secrets to UI
    console.error("CommitCheck Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#dddddd] bg-white">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-[#222222]">CommitCheck</span>
              <span className="text-[11px] font-medium text-[#6a6a6a] tracking-wider uppercase -mt-1">
                System Recovery
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#dddddd] text-[#222222] hover:bg-[#f7f7f7] transition-colors"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Main Error Box */}
      <main className="max-w-xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-[#fff8f6] text-[#c13515] border border-[#fbd5cb] flex items-center justify-center mb-6 airbnb-shadow">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#fff8f6] text-[#c13515] border border-[#fbd5cb] mb-3">
          Error 500 &bull; Application Failure
        </span>

        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#222222] mb-3">
          Something went wrong while rendering this page
        </h1>

        <p className="text-sm text-[#6a6a6a] max-w-md mb-4 leading-relaxed">
          An unexpected issue prevented the application from loading. Your saved project data, meeting transcripts, and code audits remain safely preserved.
        </p>

        {error.digest && (
          <div className="mb-6 px-3 py-1.5 rounded-[6px] bg-[#f7f7f7] border border-[#dddddd] text-[11px] font-mono text-[#6a6a6a]">
            Correlation ID: {error.digest}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:ring-offset-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#222222]"
          >
            <Home className="w-4 h-4 text-[#6a6a6a]" />
            Return Home
          </Link>
        </div>

        <div className="mt-8 text-xs text-[#6a6a6a]">
          Need immediate help?{" "}
          <Link href="/support" className="text-[#ff385c] underline font-medium hover:text-[#e00b41]">
            Contact CommitCheck Support
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
