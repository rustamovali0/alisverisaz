import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { dashboardNavigation } from "@/lib/dashboard/navigation";

type CustomerDashboardLayoutProps = {
  children: ReactNode;
};

export default async function CustomerDashboardLayout({
  children,
}: CustomerDashboardLayoutProps) {
  const current = await requireRole(["customer"], "/dashboard");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "İstifadəçi";

  return (
    <AppDashboardShell
      title="Fərdi panel"
      description="Elanlar, sifarişlər, favorilər və ödənişlər"
      userLabel={userLabel}
      navItems={dashboardNavigation.customer}
    >
      {children}
    </AppDashboardShell>
  );
}
