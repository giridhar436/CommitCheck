import React from "react";
import Link from "next/link";
import { LucideIcon, FolderKanban } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  secondaryActionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderKanban,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  secondaryActionText,
  secondaryActionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`rounded-[14px] border border-dashed border-[#dddddd] bg-[#f7f7f7] p-10 md:p-14 text-center ${className}`}
    >
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-white border border-[#dddddd] flex items-center justify-center mb-4 text-[#ff385c] airbnb-shadow">
          <Icon className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-[#222222] mb-1.5">
          {title}
        </h3>
        <p className="text-sm text-[#6a6a6a] leading-relaxed mb-6">
          {description}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && actionHref && (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center h-10 px-5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:ring-offset-2"
            >
              {actionText}
            </Link>
          )}

          {actionText && onAction && !actionHref && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center h-10 px-5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:ring-offset-2 cursor-pointer"
            >
              {actionText}
            </button>
          )}

          {secondaryActionText && secondaryActionHref && (
            <Link
              href={secondaryActionHref}
              className="inline-flex items-center justify-center h-10 px-4 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#222222] focus:ring-offset-2"
            >
              {secondaryActionText}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
