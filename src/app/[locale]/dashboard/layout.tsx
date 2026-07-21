import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";

type CustomerDashboardLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function CustomerDashboardLayout({
  children,
}: CustomerDashboardLayoutProps) {
  const current = await requireRole(["customer"], "/dashboard");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "İstifadəçi";
  const navItems: DashboardNavItem[] = [
    {
      title: "Sifarişlərim",
      href: "/dashboard",
      icon: "shoppingCart",
    },
    {
      title: "Profil",
      href: "/dashboard/profile",
      icon: "user",
    },
  ];

  return (
    <AppDashboardShell
      title="Fərdi panel"
      description="Sifariş statusu və hesab məlumatları"
      userLabel={userLabel}
      navItems={navItems}
    >
      {children}
    </AppDashboardShell>
  );
}
