import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/dashboard/data";

export default async function AdminPage() {
  await requireRole(["admin"], "/admin");
  const overview = await getAdminOverview();

  return (
    <div className="space-y-6">
      <StatGrid items={overview.stats} />
      <DashboardPanel
        title="Platforma xülasəsi"
        description="Admin roluna açıq real Supabase sayları"
      >
        {overview.stats.every((item) => Number(item.value) === 0) ? (
          <EmptyState
            className="min-h-56"
            title="Məlumat yoxdur"
            description="Platforma cədvəllərində real qeyd yarandıqda burada görünəcək."
          />
        ) : (
          <div className="grid gap-3 text-sm text-muted-foreground">
            {overview.stats.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-md border bg-background p-3"
              >
                <span>{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}
