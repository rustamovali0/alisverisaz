import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function readMetadataText(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const value = (metadata as Record<string, unknown>)[key];

  return typeof value === "string" ? value : "";
}

export default async function AdminAuditLogPage() {
  await requireRole(["admin"], "/radmin/audit-log");
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("admin_audit_logs")
    .select("id,admin_id,action,entity_type,entity_id,success,metadata,created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(50);

  return (
    <DashboardPanel
      title="Audit log"
      description="Radmin əməliyyatları, saat, cihaz və texniki izlər. Bu loglar silinmir."
    >
      {((data ?? []) as any[]).length === 0 ? (
        <div className="rounded-lg border bg-background p-10 text-center">
          <p className="text-xl font-black">Audit qeydi yoxdur</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Radmin əməliyyatları icra olunduqca burada görünəcək.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {((data ?? []) as any[]).map((item) => {
            const device = readMetadataText(item.metadata, "device");
            const ip = readMetadataText(item.metadata, "ip_address");
            const userAgent = readMetadataText(item.metadata, "user_agent");

            return (
              <article key={item.id} className="rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black">{item.action}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.entity_type}
                      {item.entity_id ? ` · ${item.entity_id}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {item.success === false ? "Uğursuz" : "Uğurlu"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>
                    Saat:{" "}
                    {new Intl.DateTimeFormat("az-AZ", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(item.created_at))}
                  </span>
                  <span>Cihaz: {device || "Naməlum"}</span>
                  <span>IP: {ip || "-"}</span>
                </div>
                {userAgent ? (
                  <p className="mt-2 break-words text-xs text-muted-foreground">
                    User agent: {userAgent}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}
