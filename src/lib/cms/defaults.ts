import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import type { SiteSettings } from "@/lib/cms/types";

export const homeThemeKeys = [
  "default",
  "modern-marketplace",
  "luxury-commerce",
  "minimal-storefront",
  "bold-catalog",
] as const;

export const defaultSiteSettings: SiteSettings = {
  siteName: "alisveris.az",
  shortName: "Alisveris",
  logoUrl: "",
  darkLogoUrl: "",
  faviconUrl: "",
  defaultSeoTitle: "alisveris.az - Marketplace, mağaza və elan platforması",
  defaultMetaDescription:
    "Azərbaycanda məhsul satışı, mağaza idarəetməsi, elan yerləşdirmə və sifarişlər üçün marketplace platforması.",
  defaultSeoKeywords:
    "alisveris.az, alışveriş, marketplace, məhsul satışı, elan, mağaza",
  contactEmail: "",
  phone: "",
  whatsapp: "",
  address: "",
  socialLinks: {},
  copyrightText: "© alisveris.az",
  maintenanceMode: false,
  userRegistrationEnabled: true,
  storeRegistrationEnabled: true,
  depositEnabled: true,
  activeHomeTheme: "default",
  defaultThemeMode: "system",
};

export const criticalSellerRoutes = new Set([
  "/store/dashboard",
  "/store/dashboard/products",
  "/store/dashboard/orders",
  "/store/dashboard/subscription",
]);

export const criticalCustomerRoutes = new Set([
  "/dashboard",
  "/dashboard/listings",
  "/dashboard/orders",
  "/dashboard/profile",
]);

export function navItemKey(item: DashboardNavItem) {
  return item.href.replace(/^\//, "").replace(/\//g, "_") || "home";
}
