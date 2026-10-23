"use client";

import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/dashboard/app-dashboard-shell";
import { SellerDailyAlert } from "@/components/seller/seller-daily-alert";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import type { SellerDailyAlertConfig } from "@/lib/seller-alerts/data";

type SellerDashboardShellProps = {
  userLabel: string;
  navItems: DashboardNavItem[];
  alertConfig: SellerDailyAlertConfig;
  userId: string;
  missingAssets: string[];
  children: ReactNode;
};

export function SellerDashboardShell({
  userLabel,
  navItems,
  alertConfig,
  userId,
  missingAssets,
  children,
}: SellerDashboardShellProps) {
  return (
    <>
      <AppDashboardShell
        title="İdarə paneli"
        description="Məhsullar, sifarişlər, mağaza və satış göstəriciləri"
        userLabel={userLabel}
        navItems={navItems}
        returnAction="logout"
        mobileRail={false}
      >
        {children}
      </AppDashboardShell>
      <SellerDailyAlert config={alertConfig} userId={userId} missingAssets={missingAssets} />
    </>
  );
}
