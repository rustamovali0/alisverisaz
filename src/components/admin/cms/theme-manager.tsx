"use client";

import { Monitor, RotateCcw, Save, Smartphone, UploadCloud } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  defaultHomeThemeColors,
  homeThemeColorPresets,
} from "@/lib/cms/defaults";
import {
  publishThemeAction,
  updateDesignSettingsAction,
  updateThemeDraftAction,
} from "@/lib/cms/actions";
import type { SiteSettings, ThemeSetting } from "@/lib/cms/types";
import {
  designPresetOptions,
  type DesignPresetKey,
  type SiteDesignSettings,
} from "@/lib/design/presets";
import { appAlert } from "@/lib/alerts/app-alert";
import { cn } from "@/lib/utils";

type ThemeManagerProps = {
  themes: ThemeSetting[];
  siteSettings: SiteSettings;
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

const designGroups: Array<{
  title: string;
  description: string;
  fields: Array<{
    key: DesignPresetKey;
    label: string;
  }>;
}> = [
  {
    title: "Ümumi Tema",
    description: "Rənglər, səthlər, radius və əsas marketplace tonu.",
    fields: [
      { key: "themePreset", label: "Tema" },
      { key: "spacingPreset", label: "Spacing" },
      { key: "typographyPreset", label: "Typography" },
    ],
  },
  {
    title: "Public Marketplace",
    description: "Navbar, ana səhifə, məhsul kartı və məhsul səhifəsi variantları.",
    fields: [
      { key: "navbarPreset", label: "Navbar" },
      { key: "homepagePreset", label: "Ana səhifə" },
      { key: "productCardPreset", label: "Məhsul kartları" },
      { key: "productDetailPreset", label: "Məhsul səhifəsi" },
    ],
  },
  {
    title: "Panellər",
    description: "Seller, customer və radmin panel görünüşləri.",
    fields: [
      { key: "sellerPanelPreset", label: "Seller panel" },
      { key: "customerPanelPreset", label: "Customer panel" },
      { key: "adminPanelPreset", label: "Admin panel" },
    ],
  },
  {
    title: "UI Elementləri",
    description: "Button, input və card presetləri.",
    fields: [
      { key: "buttonPreset", label: "Buttons" },
      { key: "inputPreset", label: "Inputs" },
      { key: "cardPreset", label: "Cards" },
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

function DesignPresetManager({ settings }: { settings: SiteSettings }) {
  const [isPending, startTransition] = useTransition();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [preview, setPreview] = useState<SiteDesignSettings>(settings.design);

  function handleDesignSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateDesignSettingsAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Dizayn saxlanmadı");
        return;
      }

      void appAlert.success("Dizayn yeniləndi", result.message);
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b bg-muted/35 p-4 xl:border-b-0 xl:border-r xl:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Design system
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-normal">Dizayn</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Theme, navbar, homepage, product card/detail və panel presetləri
                eyni global settings-dən idarə olunur.
              </p>
            </div>
            <div className="inline-flex rounded-md border bg-background p-1">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={cn(
                  "grid size-9 place-items-center rounded-md text-muted-foreground",
                  previewMode === "desktop" && "bg-primary text-primary-foreground",
                )}
                aria-label="Desktop preview"
              >
                <Monitor className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={cn(
                  "grid size-9 place-items-center rounded-md text-muted-foreground",
                  previewMode === "mobile" && "bg-primary text-primary-foreground",
                )}
                aria-label="Mobile preview"
              >
                <Smartphone className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div
            className={cn(
              "mx-auto mt-5 overflow-hidden rounded-xl border bg-background shadow-sm",
              previewMode === "mobile" ? "max-w-[260px]" : "max-w-xl",
            )}
          >
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <span className="grid size-8 place-items-center rounded-md bg-primary text-xs font-black text-primary-foreground">
                a
              </span>
              <div className="h-8 flex-1 rounded-md bg-muted" />
              <span className="size-8 rounded-md border bg-card" />
            </div>
            <div className="space-y-3 p-3">
              <div className="rounded-lg border bg-card p-3">
                <div className="h-3 w-28 rounded-full bg-primary/25" />
                <div className="mt-3 h-8 w-3/4 rounded-md bg-foreground/10" />
                <div className="mt-3 h-10 rounded-md bg-muted" />
              </div>
              <div
                className={cn(
                  "grid gap-2",
                  previewMode === "desktop" ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="product-card rounded-lg border bg-card p-2">
                    <div className="aspect-[4/3] rounded-md bg-muted" />
                    <div className="mt-2 h-3 rounded-full bg-foreground/10" />
                    <div className="mt-2 h-4 w-2/3 rounded-full bg-primary/25" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Preview lokal vizual nümunədir; publish etdikdən sonra eyni settings public
            və dashboard səthlərinə tətbiq olunur.
          </p>
        </div>

        <form action={handleDesignSubmit} className="grid gap-5 p-4 xl:p-5">
          {designGroups.map((group) => (
            <div key={group.title} className="grid gap-3 rounded-lg border bg-background/70 p-4">
              <div>
                <h4 className="text-sm font-bold">{group.title}</h4>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {group.description}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.fields.map((field) => (
                  <label key={field.key} className="grid gap-2 text-sm font-medium">
                    {field.label}
                    <select
                      name={field.key}
                      value={preview[field.key]}
                      onChange={(event) =>
                        setPreview((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {designPresetOptions[field.key].map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="submit"
              name="intent"
              value="reset"
              variant="outline"
              disabled={isPending}
            >
              <RotateCcw className="mr-2 size-4" aria-hidden="true" />
              Reset default
            </Button>
            <Button
              type="submit"
              name="intent"
              value="draft"
              variant="secondary"
              disabled={isPending}
            >
              <Save className="mr-2 size-4" aria-hidden="true" />
              Save draft
            </Button>
            <Button type="submit" name="intent" value="publish" disabled={isPending}>
              <UploadCloud className="mr-2 size-4" aria-hidden="true" />
              Publish
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function ThemeManager({ themes, siteSettings }: ThemeManagerProps) {
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
    <div className="grid gap-5">
      <DesignPresetManager settings={siteSettings} />
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
