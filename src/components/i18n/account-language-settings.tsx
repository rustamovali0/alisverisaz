"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageOptionList } from "@/components/i18n/language-switcher";
import { cn } from "@/lib/utils";

type AccountLanguageSettingsProps = {
  className?: string;
  embedded?: boolean;
};

export function AccountLanguageSettings({
  className,
  embedded = false,
}: AccountLanguageSettingsProps) {
  const t = useTranslations("settingsUi");

  return (
    <section
      className={cn(
        embedded
          ? "grid gap-3 border-b pb-4"
          : "premium-card grid gap-3 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Languages className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-normal">{t("languageSettings")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("languageSettingsDescription")}
          </p>
        </div>
      </div>
      <LanguageOptionList className="rounded-lg border bg-background p-1.5" />
    </section>
  );
}
