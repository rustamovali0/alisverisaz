import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EarningsList } from "@/components/dashboard/earnings-list";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { getStoreEarnings, getOwnedStores } from "@/lib/dashboard/data";
import { getSellerProfit } from "@/lib/seller-dashboard/profit";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StoreEarningsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/earnings");
  const enabled = await getSellerFeatureAccess(current.user.id, "earnings");

  if (!enabled) {
    return <FeatureBlocked title="Qazanclar" />;
  }

  const earnings = await getStoreEarnings(current.user.id);
  const profit = await getSellerProfit(await getOwnedStores(current.user.id));
  if (!profit) redirect("/store/dashboard/settings");

  return (
    <div className="space-y-6">
      <StatGrid items={profit.map((item) => ({
        label: "Xalis qazanc",
        value: new Intl.NumberFormat("az-AZ", { style: "currency", currency: item.currency }).format(item.amount),
        description: "Aktivləşmədən sonrakı çatdırılmış satışlar: satış − maya dəyəri",
      }))} />
      <DashboardPanel
        title="Məhsul üzrə gəlir"
        description="Sifariş edilmiş məhsullar üzrə real satış məbləğləri"
      >
        <EarningsList
          items={earnings.items}
          emptyTitle="Gəlir yoxdur"
          emptyDescription="Sifariş yarandıqda məhsul üzrə gəlirlər burada görünəcək."
        />
      </DashboardPanel>
    </div>
  );
}
