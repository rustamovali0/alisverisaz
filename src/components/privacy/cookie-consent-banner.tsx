"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "alisveris-cookie-consent";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: number | null = null;

    try {
      if (window.localStorage.getItem(STORAGE_KEY)) {
        return;
      }
    } catch {
      // The notice can still be shown for this page view if storage is unavailable.
    }

    setIsVisible(true);
    timeoutId = window.setTimeout(() => {
      setIsVisible(false);

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            value: "notice_shown",
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // Ignore storage failures; the visible notice has already closed.
      }
    }, 1000);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-[calc(5.4rem+env(safe-area-inset-bottom))] left-1/2 z-[120] w-[min(calc(100vw-1.5rem),360px)] -translate-x-1/2 rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 shadow-lg shadow-slate-950/12 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 md:bottom-5 md:left-auto md:right-5 md:translate-x-0"
      role="status"
      aria-live="polite"
    >
      Bu sayt cookie istifadə edir.
    </div>
  );
}
