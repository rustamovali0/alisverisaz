import type { DashboardNavItem } from "@/lib/dashboard/navigation";

export type ThemeMode = "light" | "dark" | "system";

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
  activeHomeTheme: string;
  defaultThemeMode: ThemeMode;
};

export type HomepageSection = {
  id: string;
  key: string;
  title: string;
  description: string;
  imageUrl: string;
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
