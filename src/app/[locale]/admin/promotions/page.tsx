import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AdminPromotionManager } from "@/components/promotions/admin-promotion-manager";
import { requireRole } from "@/lib/auth/session";
import { getAdminPromotionRequests } from "@/lib/promotions/data";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  await requireRole(["admin"], "/radmin/promotions");
  const requests = await getAdminPromotionRequests();

  return (
    <DashboardPanel
      title="Önə çıxarma sorğuları"
      description="Satıcıların mağaza və məhsul önə çıxarma sorğularını təsdiqləyin və ya rədd edin."
    >
      <AdminPromotionManager requests={requests} />
    </DashboardPanel>
  );
}
