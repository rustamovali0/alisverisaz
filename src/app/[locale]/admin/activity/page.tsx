import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getAdminActivityOverview } from "@/lib/activity/data";
import type { ActivityGroup, ActivityTimelineItem } from "@/lib/activity/data";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function GroupList({ items, emptyText }: { items: ActivityGroup[]; emptyText: string }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 12).map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4"
        >
          <div>
            <p className="font-semibold tracking-normal">{item.title}</p>
            {item.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            ) : null}
          </div>
          <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function Timeline({ items }: { items: ActivityTimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        Hələ fəaliyyət qeydi yoxdur.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border bg-background p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold tracking-normal">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDate(item.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AdminActivityPage() {
  await requireRole(["admin"], "/radmin/activity");
  const overview = await getAdminActivityOverview();

  return (
    <div className="space-y-6">
      <StatGrid items={overview.stats} />
      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardPanel
          title="Məhsul klikləri"
          description="Ən çox açılan məhsul detail səhifələri."
        >
          <GroupList
            items={overview.productClicks}
            emptyText="Hələ məhsul klik fəaliyyəti yoxdur."
          />
        </DashboardPanel>
        <DashboardPanel
          title="Mağaza klikləri"
          description="Ən çox ziyarət edilən mağaza səhifələri."
        >
          <GroupList
            items={overview.storeClicks}
            emptyText="Hələ mağaza klik fəaliyyəti yoxdur."
          />
        </DashboardPanel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardPanel
          title="Giriş və qeydiyyat"
          description="Qeydiyyat, login və logout aktivliyi."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Qeydiyyat</p>
              <p className="mt-2 text-2xl font-black">
                {overview.authEvents.registrations}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Login</p>
              <p className="mt-2 text-2xl font-black">{overview.authEvents.logins}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Logout</p>
              <p className="mt-2 text-2xl font-black">
                {overview.authEvents.logouts}
              </p>
            </div>
          </div>
        </DashboardPanel>
        <DashboardPanel
          title="Satış və əlaqə"
          description="Sifariş, mesaj və kommersiya fəaliyyətləri."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Yeni sifariş</p>
              <p className="mt-2 text-2xl font-black">
                {overview.commerceEvents.ordersCreated}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Cəmi sifariş</p>
              <p className="mt-2 text-2xl font-black">
                {overview.commerceEvents.ordersTotal}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-muted-foreground">Yeni mesaj</p>
              <p className="mt-2 text-2xl font-black">
                {overview.commerceEvents.messagesCreated}
              </p>
            </div>
          </div>
        </DashboardPanel>
      </div>
      <DashboardPanel
        title="Son fəaliyyətlər"
        description="Platformada qeydə alınan son hadisələr."
      >
        <Timeline items={overview.timeline} />
      </DashboardPanel>
    </div>
  );
}
