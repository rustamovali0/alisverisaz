"use client";

import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";

type SellerDashboardShellProps = {
  userLabel: string;
  navItems: DashboardNavItem[];
  children: ReactNode;
};

export function SellerDashboardShell({
  userLabel,
  navItems,
  children,
}: SellerDashboardShellProps) {
  return (
    <AppDashboardShell
      title="İdarə paneli"
      description="Məhsullar, sifarişlər, mağaza və satış göstəriciləri"
      userLabel={userLabel}
      navItems={navItems}
      returnHref="/"
      returnLabel="Sayta qayıt"
    >
      {children}
    </AppDashboardShell>
  );
}
