import { AnnouncementForm } from "@/components/admin/cms/announcement-form";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminAnnouncementsPage() {
  await requireRole(["admin"], "/admin/announcements");
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("announcements")
    .select("id,title,type,target,is_active,created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  return (
    <div className="space-y-6">
      <DashboardPanel
        title="Announcement sistemi"
        description="Satıcı, istifadəçi və platforma announcement-larını idarə edin."
      >
        <AnnouncementForm />
      </DashboardPanel>
      <DashboardPanel title="Son announcement-lar">
        <RecentList
          items={((data ?? []) as any[]).map((item) => ({
            id: item.id,
            title: item.title,
            description: `${item.type} · ${item.target}`,
            value: item.is_active ? "Aktiv" : "Deaktiv",
          }))}
          emptyTitle="Announcement yoxdur"
          emptyDescription="Yeni announcement yaradıldıqda burada görünəcək."
        />
      </DashboardPanel>
    </div>
  );
}
