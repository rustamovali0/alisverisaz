"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const languages: Record<string, { code: string; flag: string; name: string }> = {
  az: { code: "AZ", flag: "🇦🇿", name: "Azərbaycan" },
  en: { code: "EN", flag: "🇬🇧", name: "English" },
  ru: { code: "RU", flag: "🇷🇺", name: "Русский" },
};

export function LanguageSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const currentLocale = useLocale();

  if (routing.locales.length <= 1) {
    return null;
  }

  function switchLanguage(locale: string) {
    if (!routing.locales.includes(locale as any)) {
      locale = routing.defaultLocale;
    }

    document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <nav
      className={cn(
        "flex max-w-full items-center gap-0.5 rounded-xl border bg-background/90 p-1 shadow-sm",
        compact ? "shrink-0" : "glass-panel",
        className,
      )}
      aria-label="Dil seçimi"
    >
      <Languages
        className={cn("size-4 text-muted-foreground", compact ? "hidden" : "mx-1")}
        aria-hidden="true"
      />
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
            aria-current={isActive ? "true" : undefined}
            aria-label={`${language.name} dilinə keç`}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2 text-xs font-black text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive &&
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            <span aria-hidden="true">{language.flag}</span>
            <span>{language.code}</span>
          </button>
        );
      })}
    </nav>
  );
}
