import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getStoreAnalytics } from "@/lib/dashboard/data";

export default async function StoreAnalyticsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/analytics");
  const enabled = await getSellerFeatureAccess(current.user.id, "analytics");

  if (!enabled) {
    return <FeatureBlocked title="Analitika" />;
  }

  const analytics = await getStoreAnalytics(current.user.id);

  return (
    <div className="space-y-6">
      <StatGrid items={analytics.stats} />
      <DashboardPanel
        title="Analitika qeydləri"
        description="Real sifariş məbləğlərindən hesablanan göstəricilər"
      >
        <RecentList
          items={analytics.items}
          emptyTitle="Analitika üçün məlumat yoxdur"
          emptyDescription="Sifariş yarandıqda analitika burada görünəcək."
        />
      </DashboardPanel>
    </div>
  );
}
