"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <button
        className="relative w-8 h-8 rounded-full border border-border bg-surface-raised flex items-center justify-center opacity-70"
        aria-label="Toggle theme"
        disabled
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggle = () => {
    const nextTheme = isDark ? "light" : "dark";

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        setTheme(nextTheme);
      });
    } else {
      setTheme(nextTheme);
    }
  };

  return (
    <button
      onClick={toggle}
      className="relative w-8 h-8 rounded-full border border-border bg-surface-raised hover:bg-surface-inset flex items-center justify-center transition-colors cursor-pointer text-ink-muted hover:text-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#ff385c]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
