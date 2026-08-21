"use client";

import { useTranslations } from "next-intl";

import { LanguageCompactDropdown } from "@/components/i18n/language-switcher";
import { cn } from "@/lib/utils";

type AccountLanguageSettingsProps = {
  className?: string;
  embedded?: boolean;
};

export function AccountLanguageSettings({
  className,
}: AccountLanguageSettingsProps) {
  const common = useTranslations("common");
  const nav = useTranslations("nav");

  return (
    <section className={cn("grid gap-2 border-t pt-4", className)}>
      <h2 className="text-sm font-black tracking-normal text-foreground">
        {nav("settings")}
      </h2>
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
        <span className="min-w-0 truncate text-sm font-semibold text-muted-foreground">
          {common("language")}
        </span>
        <LanguageCompactDropdown menuPlacement="top" />
      </div>
    </section>
  );
}
