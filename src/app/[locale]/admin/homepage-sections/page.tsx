import { HomepageSectionsManager } from "@/components/admin/cms/homepage-sections-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getHomepageSections } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function AdminHomepageSectionsPage() {
  await requireRole(["admin"], "/radmin/homepage-sections");
  const sections = await getHomepageSections(true);

  return (
    <DashboardPanel
      title="Ana səhifə bölmələri"
      description="Bölmələri aktiv/deaktiv edin, mətnləri dəyişin və drag-and-drop ilə sıranı idarə edin."
    >
      <HomepageSectionsManager sections={sections} />
    </DashboardPanel>
  );
}
