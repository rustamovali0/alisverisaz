"use client";

import { Monitor, RotateCcw, Save, Smartphone, UploadCloud } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { GlobalLoader } from "@/components/common/global-loader";
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
type PreviewMode = "desktop" | "mobile";
type DesignSection =
  | "theme"
  | "navbar"
  | "homepage"
  | "product-cards"
  | "product-detail"
  | "panels"
  | "ui-elements"
  | "loading"
  | "typography-spacing";

const sectionTabs: Array<{ key: DesignSection; label: string }> = [
  { key: "theme", label: "Ümumi tema" },
  { key: "navbar", label: "Navbar" },
  { key: "homepage", label: "Ana səhifə" },
  { key: "product-cards", label: "Məhsul kartları" },
  { key: "product-detail", label: "Məhsul səhifəsi" },
  { key: "panels", label: "Panellər" },
  { key: "ui-elements", label: "UI elementləri" },
  { key: "loading", label: "Loading" },
  { key: "typography-spacing", label: "Typography & spacing" },
];

const colorGroups: Array<{
  title: string;
  fields: Array<{
    key: HomeThemeColorKey;
    name: string;
    label: string;
  }>;
}> = [
  {
    title: "Əsas rənglər",
    fields: [
      { key: "pageBackground", name: "pageBackgroundColor", label: "Page background" },
      { key: "cardBackground", name: "cardBackgroundColor", label: "Card background" },
      { key: "text", name: "textColor", label: "Text" },
      { key: "mutedText", name: "mutedTextColor", label: "Muted text" },
      { key: "border", name: "borderColor", label: "Border" },
      { key: "primary", name: "primaryColor", label: "Primary" },
      { key: "accent", name: "accentColor", label: "Accent" },
      { key: "buttonBackground", name: "buttonBackgroundColor", label: "Button background" },
      { key: "buttonText", name: "buttonTextColor", label: "Button text" },
    ],
  },
  {
    title: "Bölmə fonları",
    fields: [
      { key: "heroBackground", name: "heroBackgroundColor", label: "Hero" },
      { key: "categoriesBackground", name: "categoriesBackgroundColor", label: "Categories" },
      { key: "storesBackground", name: "storesBackgroundColor", label: "Stores" },
      { key: "productsBackground", name: "productsBackgroundColor", label: "Products" },
      { key: "benefitsBackground", name: "benefitsBackgroundColor", label: "Info" },
    ],
  },
];

const presetDescriptions: Record<string, string> = {
  "default-marketplace": "Clean marketplace, teal accent",
  minimal: "Quiet, simple commerce UI",
  modern: "Fresh cyan and green surfaces",
  premium: "Polished marketplace palette",
  "marketplace-pro": "Dense catalog-friendly layout",
  "dark-premium": "Dark premium dashboard look",
  "soft-commerce": "Soft surfaces and calm commerce",
  corporate: "Structured business marketplace",
  elegant: "Refined neutral commerce",
  compact: "Dense and space-saving",
  classic: "Familiar balanced navigation",
  marketplace: "Search-first marketplace header",
  "centered-search": "Search centered in header",
  "mega-menu": "Category-heavy desktop header",
  "two-row": "More space for search and menus",
  "category-first": "Categories as primary action",
  "mobile-focused": "Optimized for mobile actions",
  "hero-marketplace": "Hero plus marketplace grid",
  "marketplace-grid": "Products and sections first",
  "minimal-commerce": "Reduced sections and spacing",
  "premium-editorial": "Larger visual storytelling",
  "category-heavy": "Categories take priority",
  "deals-first": "Promotion-friendly ordering",
  "store-discovery": "Stores are emphasized",
  "compact-commerce": "Shorter sections, faster scan",
  "image-heavy": "More product image focus",
  "premium-hover": "Premium hover polish",
  borderless: "Cleaner card edge",
  "dense-marketplace": "More products per view",
  "gallery-left": "Gallery left, purchase right",
  "large-gallery": "Larger media presentation",
  "compact-marketplace": "Compact purchase detail",
  "sticky-purchase-panel": "Purchase panel emphasis",
  default: "Balanced dashboard layout",
  cards: "Card-based account layout",
  sidebar: "Sidebar account navigation",
  saas: "Professional seller dashboard",
  "dark-sidebar": "Dark admin sidebar",
  "light-sidebar": "Light admin sidebar",
  enterprise: "Structured admin workspace",
  rounded: "Balanced rounded buttons",
  soft: "Soft pill-like corners",
  square: "Sharper enterprise controls",
  pill: "Fully rounded buttons",
  filled: "Filled input surfaces",
  outline: "Classic outlined inputs",
  underline: "Minimal underline inputs",
  "soft-shadow": "Subtle commerce shadow",
  flat: "No shadow, pure border",
  elevated: "Slightly lifted cards",
  "glass-lite": "Light glass effect",
  "classic-spinner": "Simple circular spinner",
  "dual-ring": "Two light circular rings",
  "dots-pulse": "Three pulsing dots",
  "dots-bounce": "Three bouncing dots",
  orbit: "Small orbiting dot",
  "bars-wave": "Lightweight wave bars",
  "circle-pulse": "Soft pulsing circle",
  "logo-loader": "Compact branded loader",
  "minimal-line": "Thin loading line",
  "skeleton-spinner": "Skeleton shimmer style",
  small: "Small inline loading",
  medium: "Default balanced size",
  large: "Large page loading",
  slow: "Slow animation speed",
  normal: "Default animation speed",
  fast: "Fast animation speed",
  off: "No fullscreen overlay",
  subtle: "Light overlay when needed",
  solid: "Solid overlay when needed",
  show: "Show loading label",
  hide: "Hide loading label",
  spacious: "More breathing room",
};

const loadingPresetToLoaderType: Record<string, string> = {
  "classic-spinner": "classic",
  "dual-ring": "dual",
  "dots-pulse": "moving-dots",
  "dots-bounce": "moving-dots",
  orbit: "clock",
  "bars-wave": "wave",
  "circle-pulse": "pulse",
  "logo-loader": "pulse",
  "minimal-line": "classic",
  "skeleton-spinner": "gradient",
};

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
  formData.set("name", theme.name);
  formData.set("previewImageUrl", theme.previewImageUrl);
  formData.set("heroVariant", theme.heroVariant);
  formData.set("productCardVariant", theme.productCardVariant);
  formData.set("sectionOrder", JSON.stringify(theme.sectionOrder));
  formData.set("config", JSON.stringify({ ...theme.config, colors }));
}

function Badge({
  children,
  tone = "muted",
}: {
  children: string;
  tone?: "active" | "published" | "draft" | "muted";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-bold",
        tone === "active" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
        tone === "published" && "bg-primary/10 text-primary",
        tone === "draft" && "bg-amber-500/10 text-amber-700 dark:text-amber-200",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function PreviewToggle({
  value,
  onChange,
}: {
  value: PreviewMode;
  onChange: (value: PreviewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-background p-1">
      <button
        type="button"
        onClick={() => onChange("desktop")}
        className={cn(
          "grid size-9 place-items-center rounded-md text-muted-foreground",
          value === "desktop" && "bg-primary text-primary-foreground",
        )}
        aria-label="Desktop preview"
      >
        <Monitor className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        className={cn(
          "grid size-9 place-items-center rounded-md text-muted-foreground",
          value === "mobile" && "bg-primary text-primary-foreground",
        )}
        aria-label="Mobile preview"
      >
        <Smartphone className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ThemePreview({
  colors,
  mode,
  compact = false,
}: {
  colors: HomeThemeColors;
  mode: PreviewMode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border shadow-sm",
        mode === "mobile" ? "mx-auto max-w-[280px]" : "w-full",
      )}
      style={{
        backgroundColor: colors.pageBackground,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}
      >
        <span
          className="grid size-7 place-items-center rounded-md text-xs font-black"
          style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
        >
          a
        </span>
        <div
          className="h-7 flex-1 rounded-md border"
          style={{ borderColor: colors.border, backgroundColor: colors.pageBackground }}
        />
        <span className="size-7 rounded-md border" style={{ borderColor: colors.border }} />
      </div>
      <div className={compact ? "space-y-2 p-3" : "space-y-3 p-4"}>
        <div className="rounded-lg border p-3" style={{ borderColor: colors.border, backgroundColor: colors.heroBackground }}>
          <div className="h-2 w-16 rounded-full" style={{ backgroundColor: colors.accent }} />
          <div className="mt-3 h-6 w-2/3 rounded-md" style={{ backgroundColor: colors.text, opacity: 0.1 }} />
          <div className="mt-3 flex gap-2">
            <div className="h-8 flex-1 rounded-md border" style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }} />
            <div className="h-8 w-20 rounded-md" style={{ backgroundColor: colors.buttonBackground }} />
          </div>
        </div>
        <div className={cn("grid gap-2", mode === "desktop" ? "grid-cols-3" : "grid-cols-2")}>
          {[colors.categoriesBackground, colors.storesBackground, colors.productsBackground].map((backgroundColor, index) => (
            <div key={`${backgroundColor}-${index}`} className="rounded-md border p-2" style={{ borderColor: colors.border, backgroundColor }}>
              <div className="aspect-[4/3] rounded bg-white/70" />
              <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: colors.mutedText, opacity: 0.18 }} />
              <div className="mt-2 h-3 w-2/3 rounded-full" style={{ backgroundColor: colors.primary, opacity: 0.26 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PresetPreview({
  type,
  value,
}: {
  type: DesignPresetKey;
  value: string;
}) {
  if (type === "loadingPreset") {
    return (
      <div
        className="global-loader-root grid h-20 place-items-center rounded-lg border bg-background"
        data-loading-preset={value}
        data-loader-type={loadingPresetToLoaderType[value] ?? "classic"}
        data-loader-palette="cyan"
      >
        <GlobalLoader />
      </div>
    );
  }

  if (type === "buttonPreset") {
    return (
      <div className="grid h-20 place-items-center rounded-lg border bg-background">
        <span className={cn("rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground", value === "pill" && "rounded-full", value === "square" && "rounded-sm")}>
          Səbətə at
        </span>
      </div>
    );
  }

  if (type === "inputPreset") {
    return (
      <div className="grid h-20 place-items-center rounded-lg border bg-background px-4">
        <span className={cn("w-full rounded-md border px-3 py-2 text-sm text-muted-foreground", value === "filled" && "bg-muted", value === "underline" && "rounded-none border-x-0 border-t-0")}>
          Axtar...
        </span>
      </div>
    );
  }

  if (type === "cardPreset") {
    return (
      <div className="grid h-20 place-items-center rounded-lg border bg-background p-3">
        <span className={cn("block h-full w-full rounded-md border bg-card", value === "soft-shadow" && "shadow-md", value === "elevated" && "shadow-lg", value === "glass-lite" && "bg-white/70 shadow-sm")}>
          <span className="mx-3 mt-3 block h-2 w-1/2 rounded-full bg-primary/30" />
          <span className="mx-3 mt-2 block h-2 w-3/4 rounded-full bg-muted" />
        </span>
      </div>
    );
  }

  if (type === "typographyPreset") {
    return (
      <div className="grid h-20 content-center rounded-lg border bg-background p-3">
        <p className={cn("font-black", value === "editorial" ? "text-xl" : value === "compact" ? "text-base" : "text-lg")}>Heading</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Body text preview</p>
      </div>
    );
  }

  if (type === "spacingPreset") {
    return (
      <div className="grid h-20 place-items-center rounded-lg border bg-background p-3">
        <span className={cn("grid w-full rounded-md border bg-card", value === "compact" ? "gap-1 p-2" : value === "spacious" ? "gap-3 p-4" : "gap-2 p-3")}>
          <span className="h-2 rounded bg-primary/30" />
          <span className="h-2 w-2/3 rounded bg-muted" />
        </span>
      </div>
    );
  }

  return (
    <div className="h-20 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <span className="size-6 rounded-md bg-primary/20" />
        <span className="h-3 flex-1 rounded-full bg-muted" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <span className="h-8 rounded bg-muted" />
        <span className="h-8 rounded bg-primary/15" />
        <span className="h-8 rounded bg-muted" />
      </div>
    </div>
  );
}

function PresetCardGrid({
  fields,
  values,
  onChange,
}: {
  fields: Array<{ key: DesignPresetKey; title: string }>;
  values: SiteDesignSettings;
  onChange: (key: DesignPresetKey, value: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-6">
      {fields.map((field) => (
        <section key={field.key} className="grid min-w-0 gap-3">
          <div>
            <h3 className="text-base font-bold">{field.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Variantı seçin və yuxarıdakı action bar-dan saxlayın.
            </p>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-3 min-[1800px]:grid-cols-4">
            {designPresetOptions[field.key].map(([value, label]) => {
              const active = values[field.key] === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange(field.key, value)}
                  className={cn(
                    "min-w-0 rounded-xl border bg-card p-3 text-left shadow-sm transition hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "border-primary ring-2 ring-primary/15",
                  )}
                >
                  <PresetPreview type={field.key} value={value} />
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{label}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {presetDescriptions[value] ?? "Preset preview"}
                      </p>
                    </div>
                    {active ? <Badge tone="active">Aktiv</Badge> : <Badge>Seç</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ThemeManager({ themes, siteSettings }: ThemeManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState<DesignSection>("theme");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [design, setDesign] = useState<SiteDesignSettings>(siteSettings.design);
  const activeTheme = useMemo(
    () => themes.find((theme) => theme.isActive) ?? themes[0] ?? null,
    [themes],
  );
  const [selectedThemeKey, setSelectedThemeKey] = useState(activeTheme?.themeKey ?? "");
  const selectedTheme =
    themes.find((theme) => theme.themeKey === selectedThemeKey) ?? activeTheme;
  const selectedColors = selectedTheme ? readThemeColors(selectedTheme) : null;
  const colorFormId = selectedTheme ? `theme-editor-${selectedTheme.id}` : undefined;

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

      void appAlert.success("Draft saxlandı", result.message);
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

      void appAlert.success("Rənglər sıfırlandı", result.message);
    });
  }

  function updateDesignValue(key: DesignPresetKey, value: string) {
    setDesign((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function renderSection() {
    if (activeSection === "theme") {
      return (
        <div className="grid gap-5">
          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">Theme seçimi</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bir tema seçin, önizləyin və aktiv edin.
                </p>
              </div>
              <PreviewToggle value={previewMode} onChange={setPreviewMode} />
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-3 min-[1800px]:grid-cols-4">
              {themes.map((theme) => {
                const colors = readThemeColors(theme);
                const selected = selectedTheme?.themeKey === theme.themeKey;

                return (
                  <article
                    key={theme.id}
                    className={cn(
                      "min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm transition",
                      theme.isActive && "border-emerald-500 ring-2 ring-emerald-500/15",
                      selected && !theme.isActive && "border-primary ring-2 ring-primary/15",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedThemeKey(theme.themeKey)}
                      className="block w-full p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ThemePreview colors={colors} mode="desktop" compact />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-black">{theme.name}</h4>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {presetDescriptions[theme.themeKey] ?? "Marketplace theme"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {theme.isActive ? <Badge tone="active">Aktiv</Badge> : null}
                          <Badge tone={theme.status === "published" ? "published" : "draft"}>
                            {theme.status === "published" ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    </button>
                    <div className="flex gap-2 border-t bg-muted/25 p-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedThemeKey(theme.themeKey)}
                      >
                        Önizlə
                      </Button>
                      <form action={handlePublish} className="flex-1">
                        <input type="hidden" name="themeKey" value={theme.themeKey} />
                        <Button type="submit" className="w-full" disabled={isPending || theme.isActive}>
                          {theme.isActive ? "Aktiv temadır" : "Aktiv et"}
                        </Button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {selectedTheme && selectedColors ? (
            <section className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">{selectedTheme.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTheme.isActive ? <Badge tone="active">Aktiv</Badge> : null}
                    <Badge tone={selectedTheme.status === "published" ? "published" : "draft"}>
                      {selectedTheme.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
                <PreviewToggle value={previewMode} onChange={setPreviewMode} />
              </div>

              <ThemePreview colors={selectedColors} mode={previewMode} />

              <form
                key={selectedTheme.id}
                id={colorFormId}
                action={handleSaveColors}
                className="grid gap-4"
              >
                <input type="hidden" name="themeKey" value={selectedTheme.themeKey} />
                <details className="rounded-lg border bg-background">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
                    Advanced rənglər
                  </summary>
                  <div className="grid gap-5 border-t p-4">
                    {colorGroups.map((group) => (
                      <div key={group.title} className="grid gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {group.title}
                        </p>
                        <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
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
                                  defaultValue={selectedColors[field.key]}
                                  disabled={isPending}
                                  className="size-10 shrink-0 cursor-pointer rounded-md border bg-background p-1 disabled:opacity-60"
                                />
                                <span className="min-w-0 flex-1 truncate rounded-md border bg-muted px-2 py-2 font-mono text-xs">
                                  {selectedColors[field.key]}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </form>
            </section>
          ) : null}
        </div>
      );
    }

    if (activeSection === "navbar") {
      return (
        <PresetCardGrid
          fields={[{ key: "navbarPreset", title: "Navbar variantları" }]}
          values={design}
          onChange={updateDesignValue}
        />
      );
    }

    if (activeSection === "homepage") {
      return (
        <PresetCardGrid
          fields={[{ key: "homepagePreset", title: "Ana səhifə layoutları" }]}
          values={design}
          onChange={updateDesignValue}
        />
      );
    }

    if (activeSection === "product-cards") {
      return (
        <PresetCardGrid
          fields={[{ key: "productCardPreset", title: "Məhsul kartı variantları" }]}
          values={design}
          onChange={updateDesignValue}
        />
      );
    }

    if (activeSection === "product-detail") {
      return (
        <PresetCardGrid
          fields={[{ key: "productDetailPreset", title: "Məhsul səhifəsi variantları" }]}
          values={design}
          onChange={updateDesignValue}
        />
      );
    }

    if (activeSection === "panels") {
      return (
        <PresetCardGrid
          fields={[
            { key: "sellerPanelPreset", title: "Seller panel" },
            { key: "customerPanelPreset", title: "Customer panel" },
            { key: "adminPanelPreset", title: "Admin panel" },
          ]}
          values={design}
          onChange={updateDesignValue}
        />
      );
    }

    if (activeSection === "ui-elements") {
      return (
        <PresetCardGrid
          fields={[
            { key: "buttonPreset", title: "Buttons" },
            { key: "inputPreset", title: "Inputs" },
            { key: "cardPreset", title: "Cards" },
          ]}
          values={design}
          onChange={updateDesignValue}
        />
      );
    }

    if (activeSection === "loading") {
      return (
        <PresetCardGrid
          fields={[
            { key: "loadingPreset", title: "Loading presetləri" },
            { key: "loaderSize", title: "Loader ölçüsü" },
            { key: "loaderSpeed", title: "Loader sürəti" },
            { key: "loaderOverlay", title: "Fullscreen overlay" },
            { key: "loaderText", title: "Loading text" },
          ]}
          values={design}
          onChange={updateDesignValue}
        />
      );
    }

    return (
      <PresetCardGrid
        fields={[
          { key: "typographyPreset", title: "Typography presetləri" },
          { key: "spacingPreset", title: "Spacing presetləri" },
          { key: "themePreset", title: "Global rəng presetləri" },
        ]}
        values={design}
        onChange={updateDesignValue}
      />
    );
  }

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-hidden">
      <div className="sticky top-16 z-20 min-w-0 max-w-full overflow-hidden rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0 max-w-full overflow-x-auto pb-1">
            <div className="flex w-max gap-2">
              {sectionTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveSection(tab.key)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground",
                    activeSection === tab.key && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeSection === "theme" && selectedTheme ? (
            <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <form action={handleResetColors} className="min-w-0">
                <input type="hidden" name="themeKey" value={selectedTheme.themeKey} />
                <Button type="submit" variant="outline" disabled={isPending} className="w-full sm:w-auto">
                  <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                  Dəyişiklikləri sıfırla
                </Button>
              </form>
              <Button
                type="submit"
                form={colorFormId}
                variant="secondary"
                disabled={isPending || !colorFormId}
                className="w-full sm:w-auto"
              >
                <Save className="mr-2 size-4" aria-hidden="true" />
                Draft saxla
              </Button>
              <form action={handlePublish} className="min-w-0">
                <input type="hidden" name="themeKey" value={selectedTheme.themeKey} />
                <Button type="submit" disabled={isPending || selectedTheme.isActive} className="w-full sm:w-auto">
                  <UploadCloud className="mr-2 size-4" aria-hidden="true" />
                  {selectedTheme.isActive ? "Aktiv temadır" : "Publish"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="min-w-0">
              <form id="design-settings-form" action={handleDesignSubmit} className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                {Object.entries(design).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
                <Button
                  type="submit"
                  name="intent"
                  value="reset"
                  variant="outline"
                  disabled={isPending}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                  Dəyişiklikləri sıfırla
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="draft"
                  variant="secondary"
                  disabled={isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="mr-2 size-4" aria-hidden="true" />
                  Draft saxla
                </Button>
                <Button type="submit" name="intent" value="publish" disabled={isPending} className="w-full sm:w-auto">
                  <UploadCloud className="mr-2 size-4" aria-hidden="true" />
                  Publish
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 max-w-full overflow-hidden">{renderSection()}</div>
    </div>
  );
}
