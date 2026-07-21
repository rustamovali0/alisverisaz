import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { getDashboardNavigationForRole } from "@/lib/cms/data";

type AdminLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const current = await requireRole(["admin"], "/radmin");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "Admin";
  const navItems = await getDashboardNavigationForRole("admin");

  return (
    <AppDashboardShell
      title="Admin panel"
      description="Platforma istifadəçiləri, mağazalar və sistem idarəsi"
      userLabel={userLabel}
      navItems={navItems}
    >
      {children}
    </AppDashboardShell>
  );
}
