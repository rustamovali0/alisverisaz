import type { ReactNode } from "react";

import { SellerDashboardShell } from "@/components/seller/seller-dashboard-shell";
import { requireSeller } from "@/lib/auth/seller-auth";
import { getDashboardNavigationForRole } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { isProfitTrackingEnabled } from "@/lib/products/profit";
import { getSellerDailyAlertConfig } from "@/lib/seller-alerts/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  const [ownedStores, alertConfig] = await Promise.all([
    getOwnedStores(current.user.id),
    getSellerDailyAlertConfig(),
  ]);
  const profitEnabled = ownedStores
    .some((store) => isProfitTrackingEnabled(store.settings));
  const admin = createSupabaseAdminClient();
  const { data: brandingStores } = await (admin as any)
    .from("stores")
    .select("name,logo_url,cover_url")
    .eq("owner_id", current.user.id);
  const missingAssets = ((brandingStores ?? []) as Array<{
    name: string;
    logo_url: string | null;
    cover_url: string | null;
  }>)
    .flatMap((store) => [
      ...(!store.logo_url ? [`${store.name}: logo`] : []),
      ...(!store.cover_url ? [`${store.name}: banner`] : []),
    ]);

  return (
    <SellerDashboardShell
      userLabel={userLabel}
      userId={current.user.id}
      alertConfig={alertConfig}
      missingAssets={missingAssets}
      navItems={navItems.filter((item) =>
        profitEnabled || item.href !== "/store/dashboard/earnings")}
    >
      {children}
    </SellerDashboardShell>
  );
}
