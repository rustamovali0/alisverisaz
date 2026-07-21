import type { AuthRole } from "@/lib/auth/types";

export type DashboardIcon =
  | "barChart"
  | "box"
  | "building"
  | "creditCard"
  | "heart"
  | "home"
  | "package"
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
      href: "/store/dashboard",
      icon: "home",
    },
    {
      title: "Məhsullar",
      titleKey: "products",
      href: "/store/dashboard/products",
      icon: "box",
    },
    {
      title: "Sifarişlər",
      titleKey: "orders",
      href: "/store/dashboard/orders",
      icon: "shoppingCart",
    },
    {
      title: "Beh sifarişləri",
      titleKey: "deposits",
      href: "/store/dashboard/deposits",
      icon: "creditCard",
    },
    {
      title: "Müştərilər",
      titleKey: "customers",
      href: "/store/dashboard/customers",
      icon: "users",
    },
    {
      title: "Analitika",
      titleKey: "analytics",
      href: "/store/dashboard/analytics",
      icon: "barChart",
    },
    {
      title: "Abunəlik",
      titleKey: "subscription",
      href: "/store/dashboard/subscription",
      icon: "receipt",
    },
    {
      title: "Ayarlar",
      titleKey: "settings",
      href: "/store/dashboard/settings",
      icon: "settings",
    },
  ],
  admin: [
    {
      title: "Dashboard",
      titleKey: "dashboard",
      href: "/admin",
      icon: "home",
    },
    {
      title: "İstifadəçilər",
      titleKey: "users",
      href: "/admin/users",
      icon: "users",
    },
    {
      title: "Mağazalar",
      titleKey: "stores",
      href: "/admin/stores",
      icon: "building",
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
      title: "Abunəliklər",
      titleKey: "subscription",
      href: "/admin/subscriptions",
      icon: "receipt",
    },
    {
      title: "Sistem ayarları",
      titleKey: "systemSettings",
      href: "/admin/settings",
      icon: "settings",
    },
  ],
};
