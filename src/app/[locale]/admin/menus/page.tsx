import { NavigationManager } from "@/components/admin/cms/navigation-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getNavigationMenus } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function AdminMenusPage() {
  await requireRole(["admin"], "/radmin/menus");
  const menus = await getNavigationMenus({ ensureDefaults: true });

  return (
    <DashboardPanel
      title="Menyu idarəetməsi"
      description="Saytın əsas menyusunu və kabinet bölmələrini idarə edin."
    >
      <NavigationManager menus={menus} />
    </DashboardPanel>
  );
}
