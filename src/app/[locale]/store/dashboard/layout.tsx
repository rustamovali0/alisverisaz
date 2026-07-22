import type { ReactNode } from "react";

import { SellerDashboardShell } from "@/components/seller/seller-dashboard-shell";
import { requireSeller } from "@/lib/auth/seller-auth";
import { getDashboardNavigationForRole } from "@/lib/cms/data";

type StoreDashboardLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function StoreDashboardLayout({
  children,
}: StoreDashboardLayoutProps) {
  const current = await requireSeller();
  const userLabel = current.profile?.full_name ?? current.user.email ?? "Mağaza sahibi";
  const navItems = await getDashboardNavigationForRole("seller");

  return (
    <SellerDashboardShell userLabel={userLabel} navItems={navItems}>
      {children}
    </SellerDashboardShell>
  );
}
