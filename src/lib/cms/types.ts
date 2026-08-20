import type { DashboardNavItem } from "@/lib/dashboard/navigation";

export type ThemeMode = "light" | "dark" | "system";

export type GlobalLoaderType =
  | "classic"
  | "dual"
  | "dots-circle"
  | "moving-dots"
  | "half"
  | "wave"
  | "pulse"
  | "clock"
  | "oval"
  | "gradient";

export type GlobalLoaderPalette =
  | "primary"
  | "cyan"
  | "emerald"
  | "rose"
  | "amber"
  | "violet";

export type MobileNavbarVariant =
  | "classic"
  | "floating"
  | "pill"
  | "compact"
  | "outlined"
  | "soft"
  | "solid"
  | "glass"
  | "minimal"
  | "rail";

export type SiteSettings = {
  siteName: string;
  shortName: string;
  logoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  defaultSeoTitle: string;
  defaultMetaDescription: string;
  defaultSeoKeywords: string;
  contactEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  socialLinks: Record<string, string>;
  copyrightText: string;
  maintenanceMode: boolean;
  userRegistrationEnabled: boolean;
  storeRegistrationEnabled: boolean;
  depositEnabled: boolean;
  showSubscriptionInSellerPanel: boolean;
  globalLoader: {
    type: GlobalLoaderType;
    palette: GlobalLoaderPalette;
  };
  mobileNavbarVariant: MobileNavbarVariant;
  subscriptionLimits: {
    defaultProductLimit: number | null;
    defaultImagesPerProductLimit: number | null;
  };
  activeHomeTheme: string;
  defaultThemeMode: ThemeMode;
};

export type HomepageSection = {
  id: string;
  key: string;
  title: string;
  description: string;
  imageUrl: string;
  settings: Record<string, unknown>;
  showTitle: boolean;
  showDescription: boolean;
  buttonLabel: string;
  buttonUrl: string;
  itemLimit: number;
  dataFilter: string;
  sortOrder: number;
  isActive: boolean;
  showMobile: boolean;
  showDesktop: boolean;
  themeVariant: string;
  status: string;
};

export type ThemeSetting = {
  id: string;
  themeKey: string;
  name: string;
  status: string;
  isActive: boolean;
  previewImageUrl: string;
  heroVariant: string;
  productCardVariant: string;
  sectionOrder: string[];
  config: Record<string, unknown>;
};

export type ManagedNavigationMenu = {
  id: string;
  key: string;
  title: string;
  location: string;
  isActive: boolean;
  isSystem: boolean;
  items: ManagedNavigationItem[];
};

export type ManagedNavigationItem = DashboardNavItem & {
  id: string;
  menuId: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  showMobile: boolean;
  showDesktop: boolean;
  requiredRole: string | null;
  requiredFeature: string | null;
  badgeText: string | null;
};

export type MediaAsset = {
  id: string;
  url: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  usageCount: number;
  createdAt: string;
};

export type PanelFeatureSettings = {
  title: string;
  features: Record<string, boolean>;
  sidebarItems: Array<{
    key: string;
    title: string;
    href: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
    showMobile: boolean;
    showDesktop: boolean;
    badgeText?: string;
    planNames?: string[];
  }>;
  settings: Record<string, unknown>;
};

export type CmsActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };
