"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { setUserLocale } from "@/i18n/actions";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export const languages: Record<string, { code: string; name: string }> = {
  az: { code: "AZ", name: "Azərbaycan" },
  en: { code: "EN", name: "English" },
  ru: { code: "RU", name: "Русский" },
};
const localeCookieName = "NEXT_LOCALE";
const localeCookieMaxAge = 60 * 60 * 24 * 365;

function isSupportedLocale(locale: string): locale is Locale {
  return routing.locales.includes(locale as Locale);
}

function getClientLocaleCookieDomain() {
  if (typeof window === "undefined") {
    return "";
  }

  const hostname = window.location.hostname.toLowerCase();

  if (hostname === "alisveris.az" || hostname.endsWith(".alisveris.az")) {
    return "domain=.alisveris.az";
  }

  return "";
}

function writeClientLocaleCookie(locale: Locale) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  document.cookie = [
    `${localeCookieName}=${locale}`,
    "path=/",
    `max-age=${localeCookieMaxAge}`,
    "samesite=lax",
    window.location.protocol === "https:" ? "secure" : "",
    getClientLocaleCookieDomain(),
  ]
    .filter(Boolean)
    .join("; ");
}

function RoundFlag({
  locale,
  className,
}: {
  locale: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200", className)}
      aria-hidden="true"
    >
      {locale === "az" ? (
        <svg viewBox="0 0 36 36" className="h-full w-full" role="img">
          <rect width="36" height="12" fill="#00B5E2" />
          <rect y="12" width="36" height="12" fill="#EF3340" />
          <rect y="24" width="36" height="12" fill="#509E2F" />
          <circle cx="17" cy="18" r="4.3" fill="none" stroke="#fff" strokeWidth="1.9" />
          <circle cx="18.6" cy="18" r="3.6" fill="#EF3340" />
          <path
            fill="#fff"
            d="m23.8 14.1.63 2.1 2.02-1.02-1.05 2 2.1.64-2.1.63 1.05 2-2.02-1.02-.63 2.1-.63-2.1-2.02 1.02 1.05-2-2.1-.63 2.1-.64-1.05-2 2.02 1.02.63-2.1Z"
          />
        </svg>
      ) : locale === "en" ? (
        <svg viewBox="0 0 36 36" className="h-full w-full" role="img">
          <rect width="36" height="36" fill="#012169" />
          <path fill="#fff" d="M0 0h4.6L36 31.4V36h-4.6L0 4.6V0Zm36 0v4.6L4.6 36H0v-4.6L31.4 0H36Z" />
          <path fill="#C8102E" d="M0 0h2.6L36 33.4V36h-2.6L0 2.6V0Zm36 0v2.6L2.6 36H0v-2.6L33.4 0H36Z" />
          <path fill="#fff" d="M14 0h8v36h-8V0ZM0 14h36v8H0v-8Z" />
          <path fill="#C8102E" d="M15.6 0h4.8v36h-4.8V0ZM0 15.6h36v4.8H0v-4.8Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 36 36" className="h-full w-full" role="img">
          <rect width="36" height="12" fill="#fff" />
          <rect y="12" width="36" height="12" fill="#0039A6" />
          <rect y="24" width="36" height="12" fill="#D52B1E" />
        </svg>
      )}
    </span>
  );
}

function useLocaleSelection({
  onSelect,
  onLocaleChange,
}: {
  onSelect?: () => void;
  onLocaleChange?: (locale: Locale) => void;
}) {
  const router = useRouter();
  const currentLocale = useLocale();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(
    isSupportedLocale(currentLocale) ? currentLocale : routing.defaultLocale,
  );
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isSupportedLocale(currentLocale)) {
      setSelectedLocale(currentLocale);
      onLocaleChange?.(currentLocale);
    }
  }, [currentLocale, onLocaleChange]);

  const switchLanguage = useCallback(
    (locale: string) => {
      const nextLocale = isSupportedLocale(locale) ? locale : routing.defaultLocale;

      setSelectedLocale(nextLocale);
      setPendingLocale(nextLocale);
      onLocaleChange?.(nextLocale);
      onSelect?.();
      writeClientLocaleCookie(nextLocale);
      router.refresh();

      startTransition(async () => {
        try {
          const persistedLocale = await setUserLocale(nextLocale);

          setSelectedLocale(persistedLocale);
          onLocaleChange?.(persistedLocale);
        } finally {
          setPendingLocale(null);
        }
      });
    },
    [onLocaleChange, onSelect, router],
  );

  return {
    selectedLocale,
    pendingLocale: isPending ? pendingLocale : null,
    switchLanguage,
  };
}

export function LanguageOptionList({
  onSelect,
  onLocaleChange,
  className,
}: {
  onSelect?: () => void;
  onLocaleChange?: (locale: Locale) => void;
  className?: string;
}) {
  const { selectedLocale, pendingLocale, switchLanguage } = useLocaleSelection({
    onSelect,
    onLocaleChange,
  });

  return (
    <div className={cn("grid gap-1", className)} role="menu">
      {routing.locales.map((locale) => {
        const language = languages[locale] ?? {
          code: locale.toUpperCase(),
          name: locale,
        };
        const isActive = selectedLocale === locale;
        const isLocalePending = pendingLocale === locale;

        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchLanguage(locale)}
            role="menuitemradio"
            aria-checked={isActive}
            className={cn(
              "flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-popover-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "bg-primary/10 text-primary",
            )}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <RoundFlag locale={locale} className="size-5" />
              <span className="truncate">{language.name}</span>
            </span>
            {isLocalePending ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : isActive ? (
              <Check className="size-4 shrink-0" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function LanguageCompactDropdown({
  className,
  menuPlacement = "top",
}: {
  className?: string;
  menuPlacement?: "top" | "bottom";
}) {
  const currentLocale = useLocale();
  const t = useTranslations("common");
  const [displayLocale, setDisplayLocale] = useState<Locale>(
    isSupportedLocale(currentLocale) ? currentLocale : routing.defaultLocale,
  );
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isSupportedLocale(currentLocale)) {
      setDisplayLocale(currentLocale);
    }
  }, [currentLocale]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const currentLanguage = languages[displayLocale] ?? languages[routing.defaultLocale];

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex h-9 max-w-[min(12rem,52vw)] items-center gap-2 rounded-lg border bg-background px-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("language")}
      >
        <RoundFlag locale={displayLocale} className="size-5" />
        <span className="min-w-0 truncate">{currentLanguage?.name}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {isOpen ? (
        <div
          className={cn(
            "absolute right-0 z-[80] w-48 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl",
            menuPlacement === "top"
              ? "bottom-[calc(100%+0.5rem)]"
              : "top-[calc(100%+0.5rem)]",
          )}
        >
          <LanguageOptionList
            onSelect={() => setIsOpen(false)}
            onLocaleChange={setDisplayLocale}
          />
        </div>
      ) : null}
    </div>
  );
}

export function LanguageSwitcher({
  className,
}: {
  className?: string;
}) {
  const currentLocale = useLocale();
  const t = useTranslations("common");
  const [displayLocale, setDisplayLocale] = useState<Locale>(
    isSupportedLocale(currentLocale) ? currentLocale : routing.defaultLocale,
  );
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isSupportedLocale(currentLocale)) {
      setDisplayLocale(currentLocale);
    }
  }, [currentLocale]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (routing.locales.length <= 1) {
    return null;
  }

  const currentLanguage = languages[displayLocale] ?? languages[routing.defaultLocale];

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="glass-panel inline-flex size-10 items-center justify-center rounded-full border bg-background/90 p-0 text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${t("language")}: ${currentLanguage?.name ?? currentLanguage?.code}`}
        title={currentLanguage?.name}
      >
        <RoundFlag locale={displayLocale} className="size-8" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-48 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
          <LanguageOptionList
            onSelect={() => setIsOpen(false)}
            onLocaleChange={setDisplayLocale}
          />
        </div>
      ) : null}
    </div>
  );
}
