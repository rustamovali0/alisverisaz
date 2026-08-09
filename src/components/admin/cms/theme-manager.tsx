"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  defaultHomeThemeColors,
  homeThemeColorPresets,
} from "@/lib/cms/defaults";
import { publishThemeAction, updateThemeDraftAction } from "@/lib/cms/actions";
import type { ThemeSetting } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/app-alert";

type ThemeManagerProps = {
  themes: ThemeSetting[];
};

type HomeThemeColors = Record<keyof typeof defaultHomeThemeColors, string>;
type HomeThemeColorKey = keyof HomeThemeColors;

const colorGroups: Array<{
  title: string;
  fields: Array<{
    key: HomeThemeColorKey;
    name: string;
    label: string;
  }>;
}> = [
  {
    title: "Ümumi rənglər",
    fields: [
      { key: "pageBackground", name: "pageBackgroundColor", label: "Səhifə fonu" },
      { key: "cardBackground", name: "cardBackgroundColor", label: "Kart fonu" },
      { key: "text", name: "textColor", label: "Əsas mətn" },
      { key: "mutedText", name: "mutedTextColor", label: "Köməkçi mətn" },
      { key: "border", name: "borderColor", label: "Border" },
      { key: "primary", name: "primaryColor", label: "Əsas rəng" },
      { key: "accent", name: "accentColor", label: "Vurğu rəngi" },
      { key: "buttonBackground", name: "buttonBackgroundColor", label: "Button fonu" },
      { key: "buttonText", name: "buttonTextColor", label: "Button mətni" },
    ],
  },
  {
    title: "Ana səhifə bölmə fonları",
    fields: [
      { key: "heroBackground", name: "heroBackgroundColor", label: "Hero fonu" },
      { key: "categoriesBackground", name: "categoriesBackgroundColor", label: "Kateqoriya fonu" },
      { key: "storesBackground", name: "storesBackgroundColor", label: "Mağaza fonu" },
      { key: "productsBackground", name: "productsBackgroundColor", label: "Məhsul fonu" },
      { key: "benefitsBackground", name: "benefitsBackgroundColor", label: "Info blok fonu" },
    ],
  },
];

function getThemeDefaults(themeKey: string): HomeThemeColors {
  const preset = (homeThemeColorPresets as Record<string, Partial<HomeThemeColors>>)[
    themeKey
  ];

  return {
    ...defaultHomeThemeColors,
    ...preset,
  };
}

function readThemeColors(theme: ThemeSetting): HomeThemeColors {
  const defaults = getThemeDefaults(theme.themeKey);
  const config = theme.config && typeof theme.config === "object" ? theme.config : {};
  const colors =
    config.colors && typeof config.colors === "object" && !Array.isArray(config.colors)
      ? (config.colors as Record<string, unknown>)
      : {};
  const nextColors = { ...defaults };

  for (const key of Object.keys(defaults) as HomeThemeColorKey[]) {
    if (typeof colors[key] === "string") {
      nextColors[key] = colors[key] as string;
    }
  }

  return nextColors;
}

function colorsFromForm(formData: FormData, themeKey: string): HomeThemeColors {
  const defaults = getThemeDefaults(themeKey);
  const nextColors = { ...defaults };

  for (const group of colorGroups) {
    for (const field of group.fields) {
      const value = String(formData.get(field.name) ?? defaults[field.key]);
      nextColors[field.key] = value;
    }
  }

  return nextColors;
}

function setThemeUpdatePayload(
  formData: FormData,
  theme: ThemeSetting,
  colors: HomeThemeColors,
) {
  const nextConfig = {
    ...theme.config,
    colors,
  };

  formData.set("name", theme.name);
  formData.set("previewImageUrl", theme.previewImageUrl);
  formData.set("heroVariant", theme.heroVariant);
  formData.set("productCardVariant", theme.productCardVariant);
  formData.set("sectionOrder", JSON.stringify(theme.sectionOrder));
  formData.set("config", JSON.stringify(nextConfig));
}

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

  function handleSaveColors(formData: FormData) {
    const themeKey = String(formData.get("themeKey") ?? "");
    const theme = themes.find((item) => item.themeKey === themeKey);

    if (!theme) {
      void appAlert.error("Tema tapılmadı.", "Rənglər saxlanmadı");
      return;
    }

    setThemeUpdatePayload(formData, theme, colorsFromForm(formData, theme.themeKey));

    startTransition(async () => {
      const result = await updateThemeDraftAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Rənglər saxlanmadı");
        return;
      }

      void appAlert.success("Rənglər saxlandı", result.message);
    });
  }

  function handleResetColors(formData: FormData) {
    const themeKey = String(formData.get("themeKey") ?? "");
    const theme = themes.find((item) => item.themeKey === themeKey);

    if (!theme) {
      void appAlert.error("Tema tapılmadı.", "Rənglər sıfırlanmadı");
      return;
    }

    setThemeUpdatePayload(formData, theme, getThemeDefaults(theme.themeKey));

    startTransition(async () => {
      const result = await updateThemeDraftAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Rənglər sıfırlanmadı");
        return;
      }

      void appAlert.success("Rənglər default vəziyyətə qaytarıldı.", result.message);
    });
  }

  return (
    <div className="grid gap-4">
      {themes.map((theme) => {
        const colors = readThemeColors(theme);

        return (
          <section
            key={theme.id}
            className="overflow-hidden rounded-xl border bg-card shadow-sm"
          >
            <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
              <div
                className="border-b p-4 xl:border-b-0 xl:border-r xl:p-5"
                style={{
                  backgroundColor: colors.pageBackground,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p style={{ color: colors.mutedText }} className="text-xs font-semibold uppercase tracking-[0.24em]">
                      Theme preview
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-normal">{theme.name}</h3>
                    <p className="mt-1 text-sm" style={{ color: colors.mutedText }}>
                      {theme.themeKey} · {theme.status}
                    </p>
                  </div>
                  {theme.isActive ? (
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: colors.buttonBackground,
                        color: colors.buttonText,
                      }}
                    >
                      Aktiv
                    </span>
                  ) : null}
                </div>

                <div
                  className="mt-5 overflow-hidden rounded-xl border shadow-sm"
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  }}
                >
                  <div
                    className="border-b px-4 py-4"
                    style={{
                      backgroundColor: colors.heroBackground,
                      borderColor: colors.border,
                    }}
                  >
                    <div
                      className="h-2 w-20 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <div
                      className="mt-3 h-7 w-2/3 rounded-lg"
                      style={{ backgroundColor: colors.text, opacity: 0.08 }}
                    />
                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                      <div
                        className="h-10 rounded-lg border"
                        style={{
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.border,
                        }}
                      />
                      <div
                        className="h-10 w-24 rounded-lg"
                        style={{ backgroundColor: colors.buttonBackground }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-3">
                    {[
                      colors.categoriesBackground,
                      colors.storesBackground,
                      colors.productsBackground,
                    ].map((backgroundColor, index) => (
                      <div
                        key={`${backgroundColor}-${index}`}
                        className="min-h-24 rounded-lg border p-3"
                        style={{
                          backgroundColor,
                          borderColor: colors.border,
                        }}
                      >
                        <div
                          className="h-3 w-1/2 rounded-full"
                          style={{ backgroundColor: colors.text, opacity: 0.16 }}
                        />
                        <div
                          className="mt-3 h-3 w-full rounded-full"
                          style={{ backgroundColor: colors.mutedText, opacity: 0.16 }}
                        />
                        <div
                          className="mt-2 h-3 w-4/5 rounded-full"
                          style={{ backgroundColor: colors.mutedText, opacity: 0.12 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold">Tema kimliyi</p>
                    <p className="text-xs text-muted-foreground">
                      {theme.themeKey} · {theme.status} · {totalThemes} tema
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={handleResetColors}>
                      <input type="hidden" name="themeKey" value={theme.themeKey} />
                      <Button type="submit" variant="outline" disabled={isPending}>
                        Sıfırla
                      </Button>
                    </form>
                    <form action={handlePublish}>
                      <input type="hidden" name="themeKey" value={theme.themeKey} />
                      <Button type="submit" disabled={isPending || theme.isActive}>
                        {theme.isActive ? "Aktiv temadır" : "Aktiv et"}
                      </Button>
                    </form>
                  </div>
                </div>

                <form action={handleSaveColors} className="grid gap-4 rounded-xl border bg-background p-4 shadow-sm">
                  <input type="hidden" name="themeKey" value={theme.themeKey} />
                  {colorGroups.map((group) => (
                    <div key={group.title} className="grid gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {group.title}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {group.fields.map((field) => (
                          <label
                            key={field.key}
                            className="grid gap-2 text-xs font-semibold text-muted-foreground"
                          >
                            {field.label}
                            <div className="flex min-w-0 items-center gap-2">
                              <input
                                name={field.name}
                                type="color"
                                defaultValue={colors[field.key]}
                                disabled={isPending}
                                className="size-10 shrink-0 cursor-pointer rounded-md border bg-background p-1 disabled:opacity-60"
                              />
                              <span className="min-w-0 flex-1 truncate rounded-md border bg-muted px-2 py-2 font-mono text-xs">
                                {colors[field.key]}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button type="submit" disabled={isPending}>
                    Rəngləri saxla
                  </Button>
                </form>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
