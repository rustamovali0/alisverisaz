import type { CSSProperties } from "react";

export const designPresetOptions = {
  themePreset: [
    ["default-marketplace", "Default Marketplace"],
    ["minimal", "Minimal"],
    ["modern", "Modern"],
    ["premium", "Premium"],
    ["marketplace-pro", "Marketplace Pro"],
    ["dark-premium", "Dark Premium"],
    ["soft-commerce", "Soft Commerce"],
    ["corporate", "Corporate"],
    ["elegant", "Elegant"],
    ["compact", "Compact"],
  ],
  navbarPreset: [
    ["classic", "Classic"],
    ["marketplace", "Marketplace"],
    ["centered-search", "Centered Search"],
    ["compact", "Compact"],
    ["mega-menu", "Mega Menu"],
    ["minimal", "Minimal"],
    ["premium", "Premium"],
    ["two-row", "Two Row"],
    ["category-first", "Category First"],
    ["mobile-focused", "Mobile Focused"],
  ],
  homepagePreset: [
    ["hero-marketplace", "Hero Marketplace"],
    ["marketplace-grid", "Marketplace Grid"],
    ["minimal-commerce", "Minimal Commerce"],
    ["premium-editorial", "Premium Editorial"],
    ["category-heavy", "Category Heavy"],
    ["deals-first", "Deals First"],
    ["store-discovery", "Store Discovery"],
    ["compact-commerce", "Compact Commerce"],
  ],
  productCardPreset: [
    ["classic", "Classic"],
    ["minimal", "Minimal"],
    ["image-heavy", "Image Heavy"],
    ["compact", "Compact"],
    ["premium-hover", "Premium Hover"],
    ["borderless", "Borderless"],
    ["dense-marketplace", "Dense Marketplace"],
  ],
  productDetailPreset: [
    ["gallery-left", "Gallery Left"],
    ["large-gallery", "Large Gallery"],
    ["compact-marketplace", "Compact Marketplace"],
    ["premium-editorial", "Premium Editorial"],
    ["sticky-purchase-panel", "Sticky Purchase Panel"],
  ],
  sellerPanelPreset: [
    ["default", "Default"],
    ["compact", "Compact"],
    ["saas", "SaaS"],
    ["premium", "Premium"],
    ["minimal", "Minimal"],
  ],
  customerPanelPreset: [
    ["default", "Default"],
    ["cards", "Cards"],
    ["compact", "Compact"],
    ["sidebar", "Sidebar"],
    ["premium", "Premium"],
  ],
  adminPanelPreset: [
    ["dark-sidebar", "Dark Sidebar"],
    ["light-sidebar", "Light Sidebar"],
    ["compact", "Compact"],
    ["enterprise", "Enterprise"],
    ["minimal", "Minimal"],
  ],
  buttonPreset: [
    ["rounded", "Rounded"],
    ["soft", "Soft"],
    ["square", "Square"],
    ["pill", "Pill"],
    ["premium", "Premium"],
    ["minimal", "Minimal"],
  ],
  inputPreset: [
    ["outline", "Outline"],
    ["filled", "Filled"],
    ["soft", "Soft"],
    ["underline", "Underline"],
    ["compact", "Compact"],
  ],
  cardPreset: [
    ["border", "Border"],
    ["soft-shadow", "Soft Shadow"],
    ["flat", "Flat"],
    ["elevated", "Elevated"],
    ["glass-lite", "Glass Lite"],
  ],
  loadingPreset: [
    ["classic-spinner", "Classic Spinner"],
    ["dual-ring", "Dual Ring"],
    ["dots-pulse", "Dots Pulse"],
    ["dots-bounce", "Dots Bounce"],
    ["orbit", "Orbit"],
    ["bars-wave", "Bars Wave"],
    ["circle-pulse", "Circle Pulse"],
    ["logo-loader", "Logo Loader"],
    ["minimal-line", "Minimal Line"],
    ["skeleton-spinner", "Skeleton + Spinner"],
  ],
  loaderSize: [
    ["small", "Small"],
    ["medium", "Medium"],
    ["large", "Large"],
  ],
  loaderSpeed: [
    ["slow", "Slow"],
    ["normal", "Normal"],
    ["fast", "Fast"],
  ],
  loaderOverlay: [
    ["off", "Off"],
    ["subtle", "Subtle"],
    ["solid", "Solid"],
  ],
  loaderText: [
    ["show", "Show"],
    ["hide", "Hide"],
  ],
  spacingPreset: [
    ["compact", "Compact"],
    ["normal", "Normal"],
    ["spacious", "Spacious"],
  ],
  typographyPreset: [
    ["modern", "Modern"],
    ["marketplace", "Marketplace"],
    ["compact", "Compact"],
    ["editorial", "Editorial"],
    ["corporate", "Corporate"],
  ],
} as const;

export type DesignPresetKey = keyof typeof designPresetOptions;

export type SiteDesignSettings = {
  [Key in DesignPresetKey]: (typeof designPresetOptions)[Key][number][0];
};

export type DesignColorOverrides = {
  buttonBackground?: string;
  buttonText?: string;
  primary?: string;
};

export const defaultDesignSettings: SiteDesignSettings = {
  themePreset: "default-marketplace",
  navbarPreset: "marketplace",
  homepagePreset: "hero-marketplace",
  productCardPreset: "classic",
  productDetailPreset: "gallery-left",
  sellerPanelPreset: "saas",
  customerPanelPreset: "cards",
  adminPanelPreset: "light-sidebar",
  buttonPreset: "rounded",
  inputPreset: "outline",
  cardPreset: "border",
  loadingPreset: "classic-spinner",
  loaderSize: "medium",
  loaderSpeed: "normal",
  loaderOverlay: "subtle",
  loaderText: "show",
  spacingPreset: "normal",
  typographyPreset: "marketplace",
};

const themeTokens = {
  "default-marketplace": {
    primary: "#0891b2",
    secondary: "#0f766e",
    accent: "#f59e0b",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    mutedText: "#64748b",
    border: "#dbe3ea",
    shadow: "0 8px 24px rgb(15 23 42 / 0.06)",
  },
  minimal: {
    primary: "#111827",
    secondary: "#475569",
    accent: "#0891b2",
    background: "#ffffff",
    surface: "#ffffff",
    text: "#111827",
    mutedText: "#64748b",
    border: "#e5e7eb",
    shadow: "0 1px 2px rgb(15 23 42 / 0.05)",
  },
  modern: {
    primary: "#0e7490",
    secondary: "#2563eb",
    accent: "#22c55e",
    background: "#f0fdfa",
    surface: "#ffffff",
    text: "#0f172a",
    mutedText: "#52616b",
    border: "#cfe8ee",
    shadow: "0 10px 28px rgb(14 116 144 / 0.09)",
  },
  premium: {
    primary: "#0f766e",
    secondary: "#334155",
    accent: "#d97706",
    background: "#f7faf9",
    surface: "#ffffff",
    text: "#10201d",
    mutedText: "#60726e",
    border: "#d9e5e1",
    shadow: "0 12px 32px rgb(15 118 110 / 0.09)",
  },
  "marketplace-pro": {
    primary: "#0284c7",
    secondary: "#0f766e",
    accent: "#f97316",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    mutedText: "#5f6f82",
    border: "#d8e2ec",
    shadow: "0 10px 30px rgb(2 132 199 / 0.08)",
  },
  "dark-premium": {
    primary: "#2dd4bf",
    secondary: "#38bdf8",
    accent: "#fbbf24",
    background: "#0b1120",
    surface: "#111827",
    text: "#f8fafc",
    mutedText: "#cbd5e1",
    border: "#263244",
    shadow: "0 14px 34px rgb(0 0 0 / 0.28)",
  },
  "soft-commerce": {
    primary: "#0d9488",
    secondary: "#64748b",
    accent: "#eab308",
    background: "#fbfdfc",
    surface: "#ffffff",
    text: "#17211f",
    mutedText: "#6b7a78",
    border: "#dde8e5",
    shadow: "0 8px 22px rgb(13 148 136 / 0.07)",
  },
  corporate: {
    primary: "#155e75",
    secondary: "#334155",
    accent: "#0ea5e9",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#111827",
    mutedText: "#64748b",
    border: "#d6dee8",
    shadow: "0 8px 20px rgb(15 23 42 / 0.06)",
  },
  elegant: {
    primary: "#115e59",
    secondary: "#3f3f46",
    accent: "#a16207",
    background: "#fafafa",
    surface: "#ffffff",
    text: "#18181b",
    mutedText: "#71717a",
    border: "#e4e4e7",
    shadow: "0 10px 26px rgb(24 24 27 / 0.06)",
  },
  compact: {
    primary: "#0f766e",
    secondary: "#475569",
    accent: "#f59e0b",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    mutedText: "#64748b",
    border: "#d7dde5",
    shadow: "0 4px 14px rgb(15 23 42 / 0.05)",
  },
} as const;

export function normalizeDesignSettings(value: unknown): SiteDesignSettings {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const next = { ...defaultDesignSettings };

  for (const key of Object.keys(designPresetOptions) as DesignPresetKey[]) {
    const optionValues = new Set(designPresetOptions[key].map(([optionValue]) => optionValue));
    const sourceValue = source[key];

    if (typeof sourceValue === "string" && optionValues.has(sourceValue as never)) {
      (next as Record<string, string>)[key] = sourceValue;
    }
  }

  return next;
}

function hexToHslTriplet(hex: string, fallback: string) {
  const normalized = hex.trim().replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((item) => item + item)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return fallback;
  }

  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    h =
      max === r
        ? (g - b) / delta + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function buildDesignCssVariables(
  settings: SiteDesignSettings,
  colors: DesignColorOverrides = {},
): CSSProperties & Record<string, string> {
  const tokens = themeTokens[settings.themePreset] ?? themeTokens["default-marketplace"];
  const primaryColor = colors.buttonBackground || colors.primary || tokens.primary;
  const buttonTextColor = colors.buttonText;
  const isCompact = settings.spacingPreset === "compact";
  const isSpacious = settings.spacingPreset === "spacious";
  const buttonRadius =
    settings.buttonPreset === "square"
      ? "0.25rem"
      : settings.buttonPreset === "pill"
        ? "999px"
        : settings.buttonPreset === "soft"
          ? "0.9rem"
          : "0.5rem";
  const cardRadius =
    settings.cardPreset === "flat" || settings.cardPreset === "border"
      ? "0.5rem"
      : settings.cardPreset === "glass-lite"
        ? "0.85rem"
        : "0.75rem";

  return {
    "--background": hexToHslTriplet(tokens.background, "210 33% 98%"),
    "--foreground": hexToHslTriplet(tokens.text, "218 31% 12%"),
    "--card": hexToHslTriplet(tokens.surface, "0 0% 100%"),
    "--card-foreground": hexToHslTriplet(tokens.text, "218 31% 12%"),
    "--popover": hexToHslTriplet(tokens.surface, "0 0% 100%"),
    "--popover-foreground": hexToHslTriplet(tokens.text, "218 31% 12%"),
    "--primary": hexToHslTriplet(primaryColor, "186 85% 32%"),
    "--primary-foreground": buttonTextColor
      ? hexToHslTriplet(buttonTextColor, "0 0% 100%")
      : settings.themePreset === "dark-premium" ? "220 29% 8%" : "0 0% 100%",
    "--secondary": hexToHslTriplet(tokens.secondary, "215 35% 94%"),
    "--secondary-foreground": settings.themePreset === "dark-premium" ? "210 32% 96%" : "216 28% 18%",
    "--muted": hexToHslTriplet(settings.themePreset === "dark-premium" ? "#1f2937" : "#f1f5f9", "214 30% 94%"),
    "--muted-foreground": hexToHslTriplet(tokens.mutedText, "216 13% 43%"),
    "--accent": hexToHslTriplet(tokens.accent, "38 94% 58%"),
    "--border": hexToHslTriplet(tokens.border, "214 24% 88%"),
    "--input": hexToHslTriplet(tokens.border, "214 24% 88%"),
    "--ring": hexToHslTriplet(primaryColor, "186 85% 32%"),
    "--radius": cardRadius,
    "--marketplace-primary": hexToHslTriplet(primaryColor, "186 85% 32%"),
    "--marketplace-primary-hover": hexToHslTriplet(primaryColor, "186 85% 28%"),
    "--marketplace-primary-soft": hexToHslTriplet(primaryColor, "186 85% 94%"),
    "--marketplace-navy": hexToHslTriplet(tokens.text, "233 43% 19%"),
    "--marketplace-muted": hexToHslTriplet(tokens.mutedText, "240 5% 58%"),
    "--toast-success": hexToHslTriplet(primaryColor, "186 85% 32%"),
    "--toast-info": hexToHslTriplet(primaryColor, "186 85% 32%"),
    "--toast-warning": hexToHslTriplet(tokens.accent, "38 94% 58%"),
    "--toast-error": "348 83% 58%",
    "--design-surface": tokens.surface,
    "--design-border": tokens.border,
    "--design-radius": cardRadius,
    "--design-button-radius": buttonRadius,
    "--design-card-radius": cardRadius,
    "--design-card-shadow":
      settings.cardPreset === "flat" || settings.cardPreset === "border"
        ? "0 1px 2px rgb(15 23 42 / 0.04)"
        : tokens.shadow,
    "--design-button-shadow":
      settings.buttonPreset === "premium" ? "0 8px 18px hsl(var(--primary) / 0.18)" : "none",
    "--design-container-pad": isCompact ? "0.875rem" : isSpacious ? "1.5rem" : "1rem",
    "--design-section-y": isCompact ? "1.75rem" : isSpacious ? "3.5rem" : "2.5rem",
    "--design-card-gap": isCompact ? "0.625rem" : isSpacious ? "1rem" : "0.875rem",
  };
}
