import { NavigationManager } from "@/components/admin/cms/navigation-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getNavigationMenus } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function AdminMenusPage() {
  await requireRole(["admin"], "/radmin/menus");
  const menus = await getNavigationMenus();

  return (
    <DashboardPanel
      title="Menyu idarəetməsi"
      description="Header, mobil, footer və panel sidebar menyularını database üzərindən idarə edin."
    >
      <NavigationManager menus={menus} />
    </DashboardPanel>
  );
}
