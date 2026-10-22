"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CommitCheck Global Fatal Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-[#222222] font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center p-8 rounded-[14px] border border-[#dddddd] bg-white shadow-lg">
          <div className="w-14 h-14 rounded-full bg-[#fff0f3] text-[#ff385c] flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h1 className="text-xl font-bold text-[#222222] mb-2">
            Critical System Error
          </h1>
          <p className="text-sm text-[#6a6a6a] mb-6">
            A critical system error occurred. We apologize for the inconvenience. Please refresh or retry.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full h-11 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
