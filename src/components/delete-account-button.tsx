"use client";

import { Trash2 } from "lucide-react";

interface DeleteAccountButtonProps {
  label?: string;
  confirmMessage?: string;
}

export function DeleteAccountButton({
  label = "Delete Account",
  confirmMessage = "Are you sure you want to delete your account? This action cannot be undone.",
}: DeleteAccountButtonProps) {
  return (
    <form action="/api/account/delete" method="POST">
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-[#c13515] hover:bg-[#b32505] text-xs font-medium text-white transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-[#c13515] focus:ring-offset-2"
        onClick={(e) => {
          if (!confirm(confirmMessage)) {
            e.preventDefault();
          }
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {label}
      </button>
    </form>
  );
}
