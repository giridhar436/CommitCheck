"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

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

export function OfflineIndicator() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isOffline = !isOnline;
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline]);

  if (!isOffline && !showReconnected) return null;

  return (
    <aside
      aria-label="Network status"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 transition-all duration-300 ease-in-out"
    >
      {isOffline ? (
        <div
          role="status"
          aria-live="assertive"
          className="flex items-center gap-3 p-3.5 rounded-[14px] bg-[#222222] text-white shadow-lg border border-[#3f3f3f]"
        >
          <div className="w-8 h-8 rounded-full bg-[#c13515] flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-semibold">You are currently offline</p>
            <p className="text-[#dddddd] mt-0.5">
              Actions will pause until network connection is restored.
            </p>
          </div>
        </div>
      ) : showReconnected ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 p-3.5 rounded-[14px] bg-emerald-900 text-white shadow-lg border border-emerald-700 animate-fade-in"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-semibold">Connection restored</p>
            <p className="text-emerald-100 mt-0.5">
              You are back online. All verification services are active.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
