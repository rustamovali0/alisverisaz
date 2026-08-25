import { PopularSearchManager } from "@/components/admin/search/popular-search-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getSearchAdministrationData } from "@/lib/search/data";

export const dynamic = "force-dynamic";

export default async function AdminSearchesPage() {
  await requireRole(["admin"], "/radmin/searches");
  const data = await getSearchAdministrationData();

  return (
    <DashboardPanel
      title="Populyar axtarışlar"
      description="Axtarış girişində görünən sözləri izləyin və istəsəniz manual olaraq seçin."
    >
      <PopularSearchManager {...data} />
    </DashboardPanel>
  );
}
