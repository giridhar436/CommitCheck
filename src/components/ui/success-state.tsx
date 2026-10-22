import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export interface SuccessStateProps {
  title: string;
  message: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function SuccessState({
  title,
  message,
  actionText,
  actionHref,
  onAction,
  className = "",
}: SuccessStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-[14px] border border-emerald-200 bg-emerald-50/60 p-8 md:p-12 text-center ${className}`}
    >
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center mb-4 airbnb-shadow">
          <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
        </div>

        <h3 className="text-xl font-semibold tracking-tight text-emerald-950 mb-2">
          {title}
        </h3>

        <p className="text-sm text-emerald-800 leading-relaxed mb-6">
          {message}
        </p>

        {actionText && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[8px] bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
          >
            {actionText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}

        {actionText && onAction && !actionHref && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-[8px] bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 cursor-pointer"
          >
            {actionText}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
