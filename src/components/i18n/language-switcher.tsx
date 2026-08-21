"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export const languages: Record<string, { code: string; flag: string; name: string }> = {
  az: { code: "AZ", flag: "🇦🇿", name: "Azərbaycan" },
  en: { code: "EN", flag: "🇬🇧", name: "English" },
  ru: { code: "RU", flag: "🇷🇺", name: "Русский" },
};

function writeLocaleCookie(locale: string) {
  const safeLocale = routing.locales.includes(locale as any)
    ? locale
    : routing.defaultLocale;

  document.cookie = `NEXT_LOCALE=${safeLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LanguageOptionList({
  onSelect,
  className,
}: {
  onSelect?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const currentLocale = useLocale();

  function switchLanguage(locale: string) {
    writeLocaleCookie(locale);
    onSelect?.();
    router.refresh();
  }

  return (
    <div className={cn("grid gap-1", className)} role="menu">
      {routing.locales.map((locale) => {
        const language = languages[locale] ?? {
          code: locale.toUpperCase(),
          flag: "",
          name: locale,
        };
        const isActive = currentLocale === locale;

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
              <span aria-hidden="true">{language.flag}</span>
              <span className="truncate">{language.name}</span>
            </span>
            {isActive ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
          </button>
        );
      })}
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
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const currentLanguage = languages[currentLocale] ?? languages[routing.defaultLocale];

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="glass-panel inline-flex h-11 items-center gap-2 rounded-xl border bg-background/90 px-3 text-sm font-black text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("language")}
      >
        <Languages className="size-4 text-muted-foreground" aria-hidden="true" />
        <span aria-hidden="true">{currentLanguage?.flag}</span>
        <span>{currentLanguage?.code}</span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-48 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
          <LanguageOptionList onSelect={() => setIsOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
