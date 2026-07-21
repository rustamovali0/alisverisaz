import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getStoreOverview } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function StoreDashboardPage() {
  const current = await requireRole(["seller"], "/store/dashboard");
  const overview = await getStoreOverview(current.user.id);

  return (
    <div className="space-y-6">
      <StatGrid items={overview.stats} />
      <DashboardPanel
        title="Son sifarişlər"
        description="Mağazalarınıza bağlı real sifarişlər"
      >
        <RecentList
          items={overview.recentOrders}
          emptyTitle="Sifariş yoxdur"
          emptyDescription="Mağazalarınıza bağlı sifariş tapılmadı."
        />
      </DashboardPanel>
      {overview.stores.length === 0 ? (
        <EmptyState
          className="rounded-md border bg-card p-8 shadow-sm"
          title="Mağaza yoxdur"
          description="Bu hesaba bağlı mağaza yaradıldıqda panel real məlumatlarla dolacaq."
        />
      ) : null}
    </div>
  );
}
