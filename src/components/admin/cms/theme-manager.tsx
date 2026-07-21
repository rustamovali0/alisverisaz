"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { publishThemeAction } from "@/lib/cms/actions";
import type { ThemeSetting } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/swal";

type ThemeManagerProps = {
  themes: ThemeSetting[];
};

export function ThemeManager({ themes }: ThemeManagerProps) {
  const [isPending, startTransition] = useTransition();

  function handlePublish(formData: FormData) {
    startTransition(async () => {
      const result = await publishThemeAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Tema aktiv olmadı");
        return;
      }

      await appAlert.success("Tema aktivdir", result.message);
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {themes.map((theme) => (
        <section key={theme.id} className="rounded-md border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-normal">{theme.name}</h3>
              <p className="text-sm text-muted-foreground">
                {theme.themeKey} · {theme.status}
              </p>
            </div>
            {theme.isActive ? (
              <span className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                Aktiv
              </span>
            ) : null}
          </div>
          <div className="mb-4 grid min-h-44 place-items-center rounded-md border bg-background p-4 text-center">
            <div className={theme.themeKey}>
              <p className="text-sm text-muted-foreground">Light / Dark preview</p>
              <p className="mt-2 text-2xl font-semibold tracking-normal">
                {theme.name}
              </p>
            </div>
          </div>
          <form action={handlePublish} className="grid gap-3">
            <input type="hidden" name="themeKey" value={theme.themeKey} />
            <Button type="submit" disabled={isPending || theme.isActive}>
              {theme.isActive ? "Aktiv temadır" : "Aktiv et"}
            </Button>
          </form>
        </section>
      ))}
    </div>
  );
}
