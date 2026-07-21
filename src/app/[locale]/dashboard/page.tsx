import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getCustomerOverview } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const current = await requireRole(["customer"], "/dashboard");
  const overview = await getCustomerOverview(current.user.id);

  return (
    <div className="space-y-6">
      <StatGrid items={overview.stats} />
      <DashboardPanel
        title="Son sifarişlər"
        description="Hesabınıza bağlı real Supabase sifarişləri"
      >
        <RecentList
          items={overview.recentOrders}
          emptyTitle="Sifariş yoxdur"
          emptyDescription="Hesabınıza bağlı sifariş tapılmadı."
        />
      </DashboardPanel>
      {overview.stats.every((item) => Number(item.value) === 0) ? (
        <EmptyState
          className="rounded-md border bg-card p-8 shadow-sm"
          title="Panel boşdur"
          description="Real Supabase məlumatları yarandıqca bu panel avtomatik dolacaq."
        />
      ) : null}
    </div>
  );
}
