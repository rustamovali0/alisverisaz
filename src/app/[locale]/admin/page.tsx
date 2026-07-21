import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { StatGrid } from "@/components/dashboard/stat-card";
import { Link } from "@/i18n/navigation";
import { getAdminActivityOverview } from "@/lib/activity/data";
import { requireRole } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole(["admin"], "/radmin");
  const [overview, activity] = await Promise.all([
    getAdminOverview(),
    getAdminActivityOverview(),
  ]);

  return (
    <div className="space-y-6">
      <StatGrid items={overview.stats} />
      <DashboardPanel
        title="Fəaliyyətlər"
        description="Klik, login/logout, mesaj və sifariş aktivliyinin qısa xülasəsi."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {activity.stats.slice(0, 8).map((item) => (
            <div key={item.label} className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-black">{item.value}</p>
            </div>
          ))}
        </div>
        <Link
          href="/radmin/activity"
          className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
        >
          Ətraflı fəaliyyətlərə bax
        </Link>
      </DashboardPanel>
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
