"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "alisveris-cookie-consent";

type CookieConsent = "all" | "necessary" | "rejected";

function saveConsent(value: CookieConsent) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        value,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Consent still applies for the current page view if storage is unavailable.
  }
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      setIsVisible(!window.localStorage.getItem(STORAGE_KEY));
    } catch {
      setIsVisible(true);
    }
  }, []);

  function choose(value: CookieConsent) {
    saveConsent(value);
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed right-3 top-3 z-[120] w-[min(calc(100vw-1.5rem),420px)] rounded-xl border border-cyan-100 bg-background/98 p-4 text-foreground shadow-2xl shadow-slate-950/15 backdrop-blur-md sm:right-5 sm:top-5">
      <div className="space-y-2">
        <p className="text-sm font-black tracking-normal">Cookie istifadəsi</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Alışveriş.az hesab girişi, dil seçimi, təhlükəsizlik və saytın rahat işləməsi
          üçün cookie-lərdən istifadə edir.
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button
          type="button"
          className="h-10 rounded-lg text-xs font-bold sm:col-span-1"
          onClick={() => choose("all")}
        >
          Hamısına icazə ver
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-lg text-xs font-bold"
          onClick={() => choose("necessary")}
        >
          Müəyyən icazə ver
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground"
          onClick={() => choose("rejected")}
        >
          Ləğv et
        </Button>
      </div>
    </div>
  );
}
