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
  | "shield"
  | "shoppingCart"
  | "sparkles"
  | "users"
  | "user";

export type DashboardNavItem = {
  title: string;
  titleKey?: string;
  href: string;
  icon: DashboardIcon;
  badgeText?: string;
};

export const dashboardNavigation: Record<AuthRole, DashboardNavItem[]> = {
  customer: [
    {
      title: "Ana səhifə",
      titleKey: "dashboard",
      href: "/dashboard",
      icon: "home",
    },
    {
      title: "Sifarişlər",
      titleKey: "orders",
      href: "/dashboard/orders",
      icon: "shoppingCart",
    },
    {
      title: "Profil",
      titleKey: "profile",
      href: "/dashboard/profile",
      icon: "user",
    },
    {
      title: "Ünvanlar",
      titleKey: "addresses",
      href: "/dashboard/addresses",
      icon: "building",
    },
    {
      title: "Bildirişlər",
      titleKey: "notifications",
      href: "/dashboard/notifications",
      icon: "sparkles",
    },
    {
      title: "Ayarlar",
      titleKey: "settings",
      href: "/dashboard/settings",
      icon: "settings",
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
      title: "Yeni məhsul əlavə et",
      href: "/store/dashboard/products#create-product",
      icon: "package",
    },
    {
      title: "Satış nöqtələri",
      href: "/store/dashboard/locations",
      icon: "building",
    },
    {
      title: "Sifarişlər",
      titleKey: "orders",
      href: "/store/dashboard/orders",
      icon: "shoppingCart",
    },
    {
      title: "Müştərilər",
      titleKey: "customers",
      href: "/store/dashboard/customers",
      icon: "users",
    },
    {
      title: "Mesajlar",
      href: "/store/dashboard/messages",
      icon: "sparkles",
    },
    {
      title: "Analitika",
      titleKey: "analytics",
      href: "/store/dashboard/analytics",
      icon: "barChart",
    },
    {
      title: "Qazanclar",
      href: "/store/dashboard/earnings",
      icon: "receipt",
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
      title: "Satış nöqtələri",
      href: "/radmin/locations",
      icon: "building",
    },
    {
      title: "Sifarişlər",
      titleKey: "orders",
      href: "/radmin/orders",
      icon: "shoppingCart",
    },
    {
      title: "Çatdırılma sistemi",
      href: "/radmin/delivery",
      icon: "shoppingCart",
    },
    {
      title: "Abunəliklər",
      titleKey: "subscription",
      href: "/radmin/subscriptions",
      icon: "receipt",
    },
    {
      title: "Elan limitləri",
      href: "/radmin/listing-limits",
      icon: "package",
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
      title: "Populyar axtarışlar",
      href: "/radmin/searches",
      icon: "sparkles",
    },
    {
      title: "Menyular",
      href: "/radmin/menus",
      icon: "menu",
    },
    {
      title: "Dizayn",
      href: "/radmin/themes",
      icon: "palette",
    },
    {
      title: "Rənglər",
      href: "/radmin/colors",
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
