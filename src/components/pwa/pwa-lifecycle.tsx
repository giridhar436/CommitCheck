"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, X, ShieldCheck } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "commitcheck_pwa_install_dismissed_until";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function subscribeToMedia(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getIsStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function subscribeToDismissal(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("commitcheck_dismiss_pwa", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("commitcheck_dismiss_pwa", callback);
    window.removeEventListener("storage", callback);
  };
}

function getDismissedSnapshot() {
  if (typeof window === "undefined") return true;
  try {
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    return Boolean(dismissedUntil && Number(dismissedUntil) > Date.now());
  } catch {
    return false;
  }
}

export function PwaLifecycle() {
  const isStandalone = useSyncExternalStore(subscribeToMedia, getIsStandalone, () => false);
  const isDismissed = useSyncExternalStore(subscribeToDismissal, getDismissedSnapshot, () => true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Register service worker and handle install events
  useEffect(() => {
    // 1. Service Worker Registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const isHttps = window.location.protocol === "https:";

      if (isHttps || isLocalhost) {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            // Check for service worker updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (
                    newWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    console.log("[CommitCheck PWA] New version installed and ready.");
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn("[CommitCheck PWA] Service Worker registration failed:", err);
          });
      }
    }

    // 2. Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // 3. Listen for appinstalled
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      console.log("[CommitCheck PWA] App was successfully installed.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      } else {
        handleDismiss();
      }
    } catch (err) {
      console.warn("[CommitCheck PWA] Prompt failed:", err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DURATION_MS)
      );
      window.dispatchEvent(new Event("commitcheck_dismiss_pwa"));
    } catch {
      // storage unavailable
    }
  };

  // Conditions for rendering install prompt:
  // - Installation capability detected (installPrompt != null)
  // - Not running in standalone mode (!isStandalone)
  // - Not dismissed (!isDismissed)
  // - Not already installed (!installed)
  if (!installPrompt || isStandalone || isDismissed || installed) {
    return null;
  }

  return (
    <aside
      aria-label="Install CommitCheck Application"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-40 animate-fade-in"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}
    >
      <div className="flex items-center gap-3.5 p-3.5 bg-surface-raised text-ink rounded-[14px] airbnb-shadow border border-border">
        <div className="w-9 h-9 rounded-full bg-[#ff385c] flex items-center justify-center text-white shrink-0 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <p className="font-semibold text-xs text-ink truncate">
            Install CommitCheck
          </p>
          <p className="text-[11px] text-ink-muted truncate mt-0.5">
            Faster access & offline support on your desktop or mobile.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] active:scale-[0.98] text-white text-xs font-medium transition-all shadow-xs cursor-pointer disabled:opacity-70 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#ff385c]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstalling ? "Installing..." : "Install"}</span>
          </button>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-inset transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
