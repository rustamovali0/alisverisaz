"use client";

import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";

type RadminDashboardShellProps = {
  userLabel: string;
  navItems: DashboardNavItem[];
  children: ReactNode;
};

export function RadminDashboardShell({
  userLabel,
  navItems,
  children,
}: RadminDashboardShellProps) {
  return (
    <AppDashboardShell
      title="Ümumi idarəetmə"
      description="Satıcılar, istifadəçilər, məhsullar və sistem idarəsi"
      userLabel={userLabel}
      navItems={navItems}
    >
      {children}
    </AppDashboardShell>
  );
}
