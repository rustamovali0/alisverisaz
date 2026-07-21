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
  href: string;
  icon: DashboardIcon;
};

export const dashboardNavigation: Record<AuthRole, DashboardNavItem[]> = {
  customer: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "home",
    },
    {
      title: "Elanlarım",
      href: "/dashboard/listings",
      icon: "package",
    },
    {
      title: "Sifarişlər",
      href: "/dashboard/orders",
      icon: "shoppingCart",
    },
    {
      title: "Favorilər",
      href: "/dashboard/favorites",
      icon: "heart",
    },
    {
      title: "Ödənişlər",
      href: "/dashboard/payments",
      icon: "creditCard",
    },
    {
      title: "Profil",
      href: "/dashboard/profile",
      icon: "user",
    },
  ],
  seller: [
    {
      title: "Dashboard",
      href: "/store/dashboard",
      icon: "home",
    },
    {
      title: "Məhsullar",
      href: "/store/dashboard/products",
      icon: "box",
    },
    {
      title: "Sifarişlər",
      href: "/store/dashboard/orders",
      icon: "shoppingCart",
    },
    {
      title: "Müştərilər",
      href: "/store/dashboard/customers",
      icon: "users",
    },
    {
      title: "Analitika",
      href: "/store/dashboard/analytics",
      icon: "barChart",
    },
    {
      title: "Abunəlik",
      href: "/store/dashboard/subscription",
      icon: "receipt",
    },
    {
      title: "Ayarlar",
      href: "/store/dashboard/settings",
      icon: "settings",
    },
  ],
  admin: [
    {
      title: "Dashboard",
      href: "/admin",
      icon: "home",
    },
    {
      title: "İstifadəçilər",
      href: "/admin/users",
      icon: "users",
    },
    {
      title: "Mağazalar",
      href: "/admin/stores",
      icon: "building",
    },
    {
      title: "Məhsullar",
      href: "/admin/products",
      icon: "box",
    },
    {
      title: "Sifarişlər",
      href: "/admin/orders",
      icon: "shoppingCart",
    },
    {
      title: "Abunəliklər",
      href: "/admin/subscriptions",
      icon: "receipt",
    },
    {
      title: "Sistem ayarları",
      href: "/admin/settings",
      icon: "settings",
    },
  ],
};
