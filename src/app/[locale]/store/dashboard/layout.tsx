import type { ReactNode } from "react";

import { SellerDashboardShell } from "@/components/seller/seller-dashboard-shell";
import { getSellerEmailStores } from "@/lib/email/seller-access";
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
  const admin = createSupabaseAdminClient();
  const [navItems, ownedStores, alertConfig, { data: brandingStores },emailStores] = await Promise.all([
    getDashboardNavigationForRole("seller"),
    getOwnedStores(current.user.id),
    getSellerDailyAlertConfig(),
    (admin as any).from("stores").select("name,logo_url,cover_url").eq("owner_id", current.user.id),getSellerEmailStores(current.user.id),
  ]);
  const profitEnabled = ownedStores
    .some((store) => isProfitTrackingEnabled(store.settings));
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
      navItems={[...navItems.filter((item) =>
        (profitEnabled || item.href !== "/store/dashboard/earnings") && item.href!=="/store/dashboard/email-campaigns"),
        ...(emailStores.length?[{title:"E-poçt kampaniyaları",href:"/store/dashboard/email-campaigns",icon:"mail" as const}]:[])]}
    >
      {children}
    </SellerDashboardShell>
  );
}
