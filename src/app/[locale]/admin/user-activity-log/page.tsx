import { ChevronLeft, ChevronRight, Filter, MonitorSmartphone, Search } from "lucide-react";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Link } from "@/i18n/navigation";
import { getAdminUserActivityLog } from "@/lib/activity/data";
import { requireRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type UserActivityLogPageProps = {
  searchParams?: Promise<{
    userId?: string;
    role?: string;
    device?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function roleLabel(role: string) {
  if (role === "seller") return "Satıcı";
  if (role === "admin") return "Admin";
  return "İstifadəçi";
}

function deviceLabel(device: string) {
  if (device === "mobile") return "Mobil";
  if (device === "desktop") return "Desktop";
  if (device === "tablet") return "Tablet";
  return "Naməlum";
}

function buildUserHref(input: {
  userId: string;
  role: string;
  device: string;
  query: string;
  from: string;
  to: string;
}) {
  return buildActivityHref({ ...input, page: 1 });
}

function buildActivityHref(input: {
  userId?: string;
  role: string;
  device: string;
  query: string;
  from: string;
  to: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (input.userId) params.set("userId", input.userId);
  if (input.role) params.set("role", input.role);
  if (input.device) params.set("device", input.device);
  if (input.query) params.set("q", input.query);
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  if (input.page > 1) params.set("page", String(input.page));

  const queryString = params.toString();

  return queryString
    ? `/radmin/user-activity-log?${queryString}`
    : "/radmin/user-activity-log";
}

export default async function AdminUserActivityLogPage({
  searchParams,
}: UserActivityLogPageProps) {
  await requireRole(["admin"], "/radmin/user-activity-log");

  const query = await searchParams;
  const activity = await getAdminUserActivityLog({
    userId: query?.userId,
    role: query?.role,
    device: query?.device,
    query: query?.q,
    from: query?.from,
    to: query?.to,
    page: query?.page,
  });
  const pageStart = activity.pagination.total === 0
    ? 0
    : (activity.pagination.page - 1) * activity.pagination.pageSize + 1;
  const pageEnd = Math.min(
    activity.pagination.page * activity.pagination.pageSize,
    activity.pagination.total,
  );

  return (
    <div className="space-y-6">
      <DashboardPanel
        title="İstifadəçi logları"
        description="Satıcı və istifadəçi fəaliyyətləri cihaz, tarix və rol filtrləri ilə göstərilir."
      >
        <form action="/radmin/user-activity-log" className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_auto]">
          {query?.userId ? <input type="hidden" name="userId" value={query.userId} /> : null}
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Axtarış
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
              <input
                name="q"
                defaultValue={activity.filters.query}
                placeholder="Ad, email, telefon..."
                className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </span>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Rol
            <select name="role" defaultValue={activity.filters.role} className="h-11 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Hamısı</option>
              <option value="seller">Satıcı</option>
              <option value="customer">İstifadəçi</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Cihaz
            <select name="device" defaultValue={activity.filters.device} className="h-11 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Hamısı</option>
              <option value="mobile">Mobil</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="unknown">Naməlum</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Başlanğıc
            <input name="from" type="date" defaultValue={activity.filters.from} className="h-11 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Son
            <input name="to" type="date" defaultValue={activity.filters.to} className="h-11 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <button type="submit" className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">
            <Filter className="size-4" aria-hidden="true" />
            Filter
          </button>
        </form>
      </DashboardPanel>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <DashboardPanel
          title="İstifadəçilər"
          description="Fəaliyyət sayına görə sıralanır."
        >
          {activity.users.length === 0 ? (
            <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Uyğun istifadəçi tapılmadı.
            </p>
          ) : (
            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
              {activity.users.map((user) => (
                <Link
                  key={user.id}
                  href={buildUserHref({
                    userId: user.id,
                    role: activity.filters.role,
                    device: activity.filters.device,
                    query: activity.filters.query,
                    from: activity.filters.from,
                    to: activity.filters.to,
                  })}
                  className={cn(
                    "block rounded-lg border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/5",
                    activity.selectedUser?.id === user.id && "border-primary bg-primary/10",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{user.label}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{user.email ?? user.id}</p>
                      {user.phone ? <p className="mt-1 text-xs text-muted-foreground">{user.phone}</p> : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                      {roleLabel(user.role)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-primary">
                    {user.activityCount} fəaliyyət
                  </p>
                </Link>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title={activity.selectedUser ? `${activity.selectedUser.label} fəaliyyətləri` : "Son fəaliyyətlər"}
          description="Seçilən istifadəçinin bütün logları tarixə görə sıralanır."
        >
          {activity.logs.length === 0 ? (
            <p className="rounded-lg border bg-background p-8 text-center text-sm text-muted-foreground">
              Seçilən filterlərə uyğun fəaliyyət tapılmadı.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {activity.pagination.total} logdan {pageStart}-{pageEnd} göstərilir
                </span>
                <span>
                  Səhifə {activity.pagination.page} / {activity.pagination.totalPages}
                </span>
              </div>

              <div className="space-y-3">
                {activity.logs.map((item) => (
                  <article key={item.id} className="rounded-lg border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black">{item.title}</p>
                        <p className="mt-1 break-words text-sm text-muted-foreground">{item.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.userLabel} · {roleLabel(item.userRole)} · {item.eventType}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                        <MonitorSmartphone className="size-3.5" aria-hidden="true" />
                        {deviceLabel(item.deviceType)}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
                        {item.device}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
                        IP: {item.ipAddress}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                {activity.pagination.hasPrevious ? (
                  <Link
                    href={buildActivityHref({
                      userId: activity.selectedUser?.id,
                      role: activity.filters.role,
                      device: activity.filters.device,
                      query: activity.filters.query,
                      from: activity.filters.from,
                      to: activity.filters.to,
                      page: activity.pagination.page - 1,
                    })}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-bold hover:bg-accent"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Əvvəlki
                  </Link>
                ) : (
                  <span />
                )}
                {activity.pagination.hasNext ? (
                  <Link
                    href={buildActivityHref({
                      userId: activity.selectedUser?.id,
                      role: activity.filters.role,
                      device: activity.filters.device,
                      query: activity.filters.query,
                      from: activity.filters.from,
                      to: activity.filters.to,
                      page: activity.pagination.page + 1,
                    })}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-bold hover:bg-accent"
                  >
                    Daha çox
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}
