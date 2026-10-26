import type { ReactNode } from "react";
import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";

type Props = { children: ReactNode };
export const dynamic = "force-dynamic";

const navItems: DashboardNavItem[] = [
  { href: "/dashboard", title: "İcmal", icon: "home" },
  { href: "/dashboard/orders", title: "Sifarişlərim", icon: "shoppingCart" },
  { href: "/dashboard/favorites", title: "Sevimlilərim", icon: "heart" },
  { href: "/dashboard/addresses", title: "Ünvanlarım", icon: "building" },
  { href: "/dashboard/profile", title: "Profil məlumatlarım", icon: "user" },
  { href: "/dashboard/security", title: "Təhlükəsizlik", icon: "shield" },
  { href: "/dashboard/notifications", title: "Bildirişlər", icon: "sparkles" },
  { href: "/dashboard/settings", title: "Parametrlər", icon: "settings" },
];

export default async function CustomerDashboardLayout({ children }: Props) {
  const current = await requireRole(["customer", "seller"], "/dashboard");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "İstifadəçi";

  return <AppDashboardShell
    title="Hesabım"
    description="Sifarişlərinizi, sevimlilərinizi və şəxsi məlumatlarınızı idarə edin"
    userLabel={userLabel}
    navItems={navItems}
    returnHref="/"
    returnLabel="Alış-verişə qayıt"
  >{children}</AppDashboardShell>;
}
