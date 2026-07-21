import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { dashboardNavigation } from "@/lib/dashboard/navigation";

type StoreDashboardLayoutProps = {
  children: ReactNode;
};

export default async function StoreDashboardLayout({
  children,
}: StoreDashboardLayoutProps) {
  const current = await requireRole(["seller"], "/store/dashboard");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "Mağaza sahibi";

  return (
    <AppDashboardShell
      title="Mağaza paneli"
      description="Məhsullar, sifarişlər, müştərilər və abunəlik"
      userLabel={userLabel}
      navItems={dashboardNavigation.seller}
    >
      {children}
    </AppDashboardShell>
  );
}
