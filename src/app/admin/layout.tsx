import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { dashboardNavigation } from "@/lib/dashboard/navigation";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const current = await requireRole(["admin"], "/admin");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "Admin";

  return (
    <AppDashboardShell
      title="Admin panel"
      description="Platforma istifadəçiləri, mağazalar və sistem idarəsi"
      userLabel={userLabel}
      navItems={dashboardNavigation.admin}
    >
      {children}
    </AppDashboardShell>
  );
}
