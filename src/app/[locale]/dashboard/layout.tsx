import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { getDashboardNavigationForRole } from "@/lib/cms/data";

type CustomerDashboardLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function CustomerDashboardLayout({
  children,
}: CustomerDashboardLayoutProps) {
  const current = await requireRole(["customer"], "/dashboard");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "İstifadəçi";
  const navItems = await getDashboardNavigationForRole("customer");

  return (
    <AppDashboardShell
      title="Fərdi panel"
      description="Elanlar, sifarişlər, favorilər və ödənişlər"
      userLabel={userLabel}
      navItems={navItems}
    >
      {children}
    </AppDashboardShell>
  );
}
