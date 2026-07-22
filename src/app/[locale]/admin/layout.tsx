import type { ReactNode } from "react";

import { RadminDashboardShell } from "@/components/radmin/radmin-dashboard-shell";
import { requireRadmin } from "@/lib/auth/radmin-auth";
import { getDashboardNavigationForRole } from "@/lib/cms/data";

type AdminLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const current = await requireRadmin();
  const userLabel = current.profile?.full_name ?? current.user.email ?? "Admin";
  const navItems = await getDashboardNavigationForRole("admin");

  return (
    <RadminDashboardShell userLabel={userLabel} navItems={navItems}>
      {children}
    </RadminDashboardShell>
  );
}
