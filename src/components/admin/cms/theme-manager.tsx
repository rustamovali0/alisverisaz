"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { publishThemeAction } from "@/lib/cms/actions";
import type { ThemeSetting } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/app-alert";
import { cn } from "@/lib/utils";

type ThemeManagerProps = {
  themes: ThemeSetting[];
};

const themePreviewStyles: Record<
  string,
  {
    shell: string;
    accent: string;
    accentSoft: string;
    surface: string;
  }
> = {
  default: {
    shell: "from-slate-50 via-background to-slate-100 dark:from-slate-900 dark:via-background dark:to-slate-950",
    accent: "bg-slate-500",
    accentSoft: "bg-slate-500/10",
    surface: "bg-slate-500/6",
  },
  "modern-marketplace": {
    shell: "from-cyan-50 via-background to-amber-50 dark:from-cyan-950/20 dark:via-background dark:to-amber-950/20",
    accent: "bg-cyan-500",
    accentSoft: "bg-cyan-500/10",
    surface: "bg-cyan-500/6",
  },
  "luxury-commerce": {
    shell: "from-stone-50 via-background to-yellow-50 dark:from-zinc-950 dark:via-background dark:to-yellow-950/20",
    accent: "bg-amber-500",
    accentSoft: "bg-amber-500/10",
    surface: "bg-amber-500/6",
  },
  "minimal-storefront": {
    shell: "from-background via-background to-muted/60",
    accent: "bg-foreground",
    accentSoft: "bg-foreground/10",
    surface: "bg-foreground/5",
  },
  "bold-catalog": {
    shell: "from-rose-50 via-background to-cyan-50 dark:from-rose-950/20 dark:via-background dark:to-cyan-950/20",
    accent: "bg-rose-500",
    accentSoft: "bg-rose-500/10",
    surface: "bg-rose-500/6",
  },
};

export function ThemeManager({ themes }: ThemeManagerProps) {
  const [isPending, startTransition] = useTransition();
  const totalThemes = themes.length;

  function handlePublish(formData: FormData) {
    startTransition(async () => {
      const result = await publishThemeAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Tema aktiv olmadı");
        return;
      }

      void appAlert.success("Tema aktivdir", result.message);
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {themes.map((theme) => (
        <section
          key={theme.id}
          className="overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <div
            className={cn(
              "grid gap-0 xl:grid-cols-[1.08fr_0.92fr]",
              themePreviewStyles[theme.themeKey]?.shell ?? themePreviewStyles.default.shell,
            )}
          >
            <div className="relative border-b bg-background/70 p-4 xl:border-b-0 xl:border-r xl:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Theme preview
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-normal">{theme.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {theme.themeKey} · {theme.status}
                  </p>
                </div>
                {theme.isActive ? (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Aktiv
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1.08fr_0.92fr]">
                <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
                  <div className="border-b bg-muted/30 px-4 py-3">
                    <div className="h-2 w-20 rounded-full bg-primary/30" />
                    <div className="mt-3 h-6 w-2/3 rounded-lg bg-foreground/5" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="h-3 w-full rounded-full bg-foreground/5" />
                    <div className="h-3 w-5/6 rounded-full bg-foreground/5" />
                    <div className="h-3 w-2/3 rounded-full bg-foreground/5" />
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div
                        className={cn(
                          "h-16 rounded-lg border",
                          themePreviewStyles[theme.themeKey]?.surface ??
                            themePreviewStyles.default.surface,
                        )}
                      />
                      <div className="grid gap-2">
                        <div className="h-6 rounded-full bg-primary/15" />
                        <div className="h-6 rounded-full bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Tema göstəriciləri
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        theme.heroVariant,
                        theme.productCardVariant,
                        `Bölmə: ${theme.sectionOrder.length || 0}`,
                      ].map((item) => (
                        <span
                          key={item}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium",
                            themePreviewStyles[theme.themeKey]?.accentSoft ??
                              themePreviewStyles.default.accentSoft,
                          )}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Rəng sxemi
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={cn(
                          "size-4 rounded-full",
                          themePreviewStyles[theme.themeKey]?.accent ??
                            themePreviewStyles.default.accent,
                        )}
                      />
                      <span className="text-sm text-muted-foreground">
                        {theme.previewImageUrl ? "Preview şəkli var" : "Preview şəkli yoxdur"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {["Primary", "Accent", "Surface"].map((label, index) => (
                        <div key={label} className="grid gap-2">
                          <div
                            className={cn(
                              "h-10 rounded-lg border",
                              index === 0
                                ? "bg-primary/85"
                                : index === 1
                                  ? "bg-accent/80"
                                  : "bg-muted",
                            )}
                          />
                          <span className="text-xs text-muted-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4 xl:p-5">
              <div className="rounded-xl border bg-background p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Hərəkət
                </p>
                <form action={handlePublish} className="mt-3 grid gap-3">
                  <input type="hidden" name="themeKey" value={theme.themeKey} />
                  <Button type="submit" disabled={isPending || theme.isActive}>
                    {theme.isActive ? "Aktiv temadır" : "Aktiv et"}
                  </Button>
                </form>
              </div>

              <div className="grid gap-3 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Tema kimliyi</p>
                    <p className="text-xs text-muted-foreground">
                      {theme.themeKey} · {theme.status}
                    </p>
                  </div>
                  <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                    {theme.isActive ? "Aktiv" : "Hazır"}
                  </span>
                </div>
                <div className="grid gap-2">
                  <div className="h-2 rounded-full bg-primary/20">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, 35 + theme.sectionOrder.length * 9)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalThemes} tema arasında bu kart daha rahat oxunan preview ilə göstərilir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
