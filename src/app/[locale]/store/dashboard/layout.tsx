import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { getDashboardNavigationForRole } from "@/lib/cms/data";

type StoreDashboardLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function StoreDashboardLayout({
  children,
}: StoreDashboardLayoutProps) {
  const current = await requireRole(["seller"], "/store/dashboard");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "Mağaza sahibi";
  const navItems = await getDashboardNavigationForRole("seller");

  return (
    <AppDashboardShell
      title="Mağaza paneli"
      description="Məhsullar, sifarişlər, müştərilər və abunəlik"
      userLabel={userLabel}
      navItems={navItems}
    >
      {children}
    </AppDashboardShell>
  );
}
