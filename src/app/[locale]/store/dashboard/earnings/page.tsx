import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { getStoreEarnings } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function StoreEarningsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/earnings");
  const enabled = await getSellerFeatureAccess(current.user.id, "analytics");

  if (!enabled) {
    return <FeatureBlocked title="Qazanclar" />;
  }

  const earnings = await getStoreEarnings(current.user.id);

  return (
    <div className="space-y-6">
      <StatGrid items={earnings.stats} />
      <DashboardPanel
        title="Məhsul üzrə gəlir"
        description="Sifariş edilmiş məhsullar üzrə real satış məbləğləri"
      >
        <RecentList
          items={earnings.items}
          emptyTitle="Gəlir yoxdur"
          emptyDescription="Sifariş yarandıqda məhsul üzrə gəlirlər burada görünəcək."
        />
      </DashboardPanel>
    </div>
  );
}
