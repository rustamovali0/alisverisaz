"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

type TurnstileFieldProps = {
  token: string;
  onTokenChange: (token: string) => void;
  siteKey?: string;
};

export function TurnstileField({ token, onTokenChange, siteKey = "" }: TurnstileFieldProps) {
  const widgetId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedWidgetIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const normalizedSiteKey = siteKey.trim();

  useEffect(() => {
    if (!isReady || !normalizedSiteKey || !containerRef.current || renderedWidgetIdRef.current) {
      return;
    }

    if (!window.turnstile) {
      return;
    }

    renderedWidgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: normalizedSiteKey,
      callback: onTokenChange,
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => onTokenChange(""),
    });
  }, [isReady, normalizedSiteKey, onTokenChange]);

  useEffect(() => {
    if (!token && renderedWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(renderedWidgetIdRef.current);
    }
  }, [token]);

  if (!normalizedSiteKey) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        CAPTCHA ayarları tamamlanmayıb.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setIsReady(true)}
      />
      <input type="hidden" name="captchaToken" value={token} />
      <div id={widgetId} ref={containerRef} />
    </div>
  );
}
