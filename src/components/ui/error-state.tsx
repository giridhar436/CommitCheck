import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, HelpCircle } from "lucide-react";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  homeHref?: string;
  supportHref?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred while processing your request. Please try again or return home.",
  onRetry,
  homeHref = "/",
  supportHref = "/support",
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-[14px] border border-[#fbd5cb] bg-[#fff8f6] p-8 md:p-12 text-center ${className}`}
    >
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-[#fce8e3] text-[#c13515] flex items-center justify-center mb-4 airbnb-shadow">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>

        <h3 className="text-xl font-semibold tracking-tight text-[#c13515] mb-2">
          {title}
        </h3>

        <p className="text-sm text-[#3f3f3f] leading-relaxed mb-6">
          {message}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-[8px] bg-[#c13515] hover:bg-[#b32505] text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#c13515] focus:ring-offset-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}

          {homeHref && (
            <Link
              href={homeHref}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#222222] focus:ring-offset-2"
            >
              <Home className="w-4 h-4 text-[#6a6a6a]" />
              Return Home
            </Link>
          )}

          {supportHref && (
            <Link
              href={supportHref}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-[8px] text-[#6a6a6a] hover:text-[#222222] font-medium text-sm transition-colors focus:outline-none"
            >
              <HelpCircle className="w-4 h-4" />
              Contact Support
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
