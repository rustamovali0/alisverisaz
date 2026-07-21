"use client";

import { Languages } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  az: "AZ",
  en: "EN",
  ru: "RU",
};

export function LanguageSwitcher() {
  const pathname = usePathname();

  if (routing.locales.length <= 1) {
    return null;
  }

  return (
    <div className="glass-panel flex items-center gap-1 rounded-md p-1">
      <Languages className="mx-2 size-4 text-muted-foreground" aria-hidden="true" />
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground",
          )}
        >
          {labels[locale]}
        </Link>
      ))}
    </div>
  );
}
