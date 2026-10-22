import React from "react";
import { SearchX, RotateCcw } from "lucide-react";

export interface NoSearchResultsProps {
  query?: string;
  onReset?: () => void;
  resetText?: string;
  suggestions?: string[];
  className?: string;
}

export function NoSearchResults({
  query,
  onReset,
  resetText = "Clear search query",
  suggestions = [
    "Check for typos or misspellings",
    "Try using broader search keywords",
    "Search by Linear ticket key (e.g. VAR-12) or repository name",
  ],
  className = "",
}: NoSearchResultsProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-[14px] border border-[#dddddd] bg-[#f7f7f7] p-8 md:p-12 text-center ${className}`}
    >
      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white border border-[#dddddd] flex items-center justify-center mb-4 text-[#6a6a6a]">
          <SearchX className="w-6 h-6" aria-hidden="true" />
        </div>

        <h3 className="text-lg font-semibold tracking-tight text-[#222222] mb-1">
          {query ? `No results for "${query}"` : "No matching items found"}
        </h3>

        <p className="text-sm text-[#6a6a6a] leading-relaxed mb-4">
          We couldn&apos;t find any records matching your search criteria.
        </p>

        {suggestions.length > 0 && (
          <ul className="text-xs text-[#6a6a6a] space-y-1.5 mb-6 text-left max-w-xs mx-auto list-disc list-inside">
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        )}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#ebebeb] text-[#222222] font-medium text-xs transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#222222] focus:ring-offset-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {resetText}
          </button>
        )}
      </div>
    </div>
  );
}
