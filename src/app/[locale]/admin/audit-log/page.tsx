import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage() {
  await requireRole(["admin"], "/radmin/audit-log");
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("admin_audit_logs")
    .select("id,action,entity_type,created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(50);

  return (
    <DashboardPanel
      title="Audit log"
      description="Admin CMS, tema, media və preview əməliyyatlarının izləri."
    >
      <RecentList
        items={((data ?? []) as any[]).map((item) => ({
          id: item.id,
          title: item.action,
          description: item.entity_type,
          value: new Intl.DateTimeFormat("az-AZ", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(item.created_at)),
        }))}
        emptyTitle="Audit qeydi yoxdur"
        emptyDescription="Admin əməliyyatları icra olunduqca burada görünəcək."
      />
    </DashboardPanel>
  );
}
