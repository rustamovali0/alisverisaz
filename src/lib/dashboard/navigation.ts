import type { AuthRole } from "@/lib/auth/types";

export type DashboardIcon =
  | "barChart"
  | "box"
  | "building"
  | "creditCard"
  | "heart"
  | "home"
  | "image"
  | "layout"
  | "menu"
  | "package"
  | "palette"
  | "receipt"
  | "settings"
  | "shoppingCart"
  | "sparkles"
  | "users"
  | "user";

export type DashboardNavItem = {
  title: string;
  titleKey?: string;
  href: string;
  icon: DashboardIcon;
};

export const dashboardNavigation: Record<AuthRole, DashboardNavItem[]> = {
  customer: [
    {
      title: "Dashboard",
      titleKey: "dashboard",
      href: "/dashboard",
      icon: "home",
    },
    {
      title: "Elanlarım",
      titleKey: "listings",
      href: "/dashboard/listings",
      icon: "package",
    },
    {
      title: "Sifarişlər",
      titleKey: "orders",
      href: "/dashboard/orders",
      icon: "shoppingCart",
    },
    {
      title: "Favorilər",
      titleKey: "favorites",
      href: "/dashboard/favorites",
      icon: "heart",
    },
    {
      title: "Ödənişlər",
      titleKey: "payments",
      href: "/dashboard/payments",
      icon: "creditCard",
    },
    {
      title: "Profil",
      titleKey: "profile",
      href: "/dashboard/profile",
      icon: "user",
    },
  ],
  seller: [
    {
      title: "Dashboard",
      titleKey: "dashboard",
      href: "/admin",
      icon: "home",
    },
    {
      title: "Məhsullar",
      titleKey: "products",
      href: "/admin/products",
      icon: "box",
    },
    {
      title: "Sifarişlər",
      titleKey: "orders",
      href: "/admin/orders",
      icon: "shoppingCart",
    },
    {
      title: "Beh sifarişləri",
      titleKey: "deposits",
      href: "/admin/deposits",
      icon: "creditCard",
    },
    {
      title: "Müştərilər",
      titleKey: "customers",
      href: "/admin/customers",
      icon: "users",
    },
    {
      title: "Mesajlar",
      href: "/admin/messages",
      icon: "sparkles",
    },
    {
      title: "Analitika",
      titleKey: "analytics",
      href: "/admin/analytics",
      icon: "barChart",
    },
    {
      title: "Qazanclar",
      href: "/admin/earnings",
      icon: "receipt",
    },
    {
      title: "Abunəlik",
      titleKey: "subscription",
      href: "/admin/subscription",
      icon: "receipt",
    },
    {
      title: "Ayarlar",
      titleKey: "settings",
      href: "/admin/settings",
      icon: "settings",
    },
  ],
  admin: [
    {
      title: "Dashboard",
      titleKey: "dashboard",
      href: "/radmin",
      icon: "home",
    },
    {
      title: "İstifadəçilər",
      titleKey: "users",
      href: "/radmin/users",
      icon: "users",
    },
    {
      title: "Mağazalar",
      titleKey: "stores",
      href: "/radmin/stores",
      icon: "building",
    },
    {
      title: "Məhsullar",
      titleKey: "products",
      href: "/radmin/products",
      icon: "box",
    },
    {
      title: "Sifarişlər",
      titleKey: "orders",
      href: "/radmin/orders",
      icon: "shoppingCart",
    },
    {
      title: "Beh sifarişləri",
      titleKey: "deposits",
      href: "/radmin/deposits",
      icon: "creditCard",
    },
    {
      title: "Abunəliklər",
      titleKey: "subscription",
      href: "/radmin/subscriptions",
      icon: "receipt",
    },
    {
      title: "Ödənişlər",
      titleKey: "payments",
      href: "/radmin/payments",
      icon: "creditCard",
    },
    {
      title: "Mesajlar",
      href: "/radmin/messages",
      icon: "sparkles",
    },
    {
      title: "Rəylər",
      href: "/radmin/reviews",
      icon: "heart",
    },
    {
      title: "Fəaliyyətlər",
      href: "/radmin/activity",
      icon: "barChart",
    },
    {
      title: "Kateqoriyalar",
      href: "/radmin/categories",
      icon: "package",
    },
    {
      title: "Sayt idarəetməsi",
      href: "/radmin/site-management",
      icon: "settings",
    },
    {
      title: "Ana səhifə bölmələri",
      href: "/radmin/homepage-sections",
      icon: "layout",
    },
    {
      title: "Menyular",
      href: "/radmin/menus",
      icon: "menu",
    },
    {
      title: "Temalar",
      href: "/radmin/themes",
      icon: "palette",
    },
    {
      title: "Satıcı paneli idarəsi",
      href: "/radmin/store-panel-management",
      icon: "building",
    },
    {
      title: "İstifadəçi paneli idarəsi",
      href: "/radmin/user-panel-management",
      icon: "user",
    },
    {
      title: "Bildirişlər",
      href: "/radmin/announcements",
      icon: "sparkles",
    },
    {
      title: "Media",
      href: "/radmin/media",
      icon: "image",
    },
    {
      title: "Sistem ayarları",
      titleKey: "systemSettings",
      href: "/radmin/settings",
      icon: "settings",
    },
    {
      title: "Audit log",
      href: "/radmin/audit-log",
      icon: "receipt",
    },
  ],
};
