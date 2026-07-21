import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getStoreAnalytics } from "@/lib/dashboard/data";

export default async function StoreAnalyticsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/analytics");
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
