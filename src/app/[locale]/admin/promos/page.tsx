import { AdminPromoSellerList } from "@/components/promos/admin-promo-seller-list";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getAdminPromoSellerList } from "@/lib/promos/data";

export const dynamic = "force-dynamic";

export default async function AdminPromosPage() {
  await requireRole(["admin"], "/radmin/promos");
  const sellers = await getAdminPromoSellerList();

  return (
    <DashboardPanel
      title="Promo kodlar"
      description="Satıcılar üzrə promo kodları idarə edin."
    >
      <AdminPromoSellerList sellers={sellers} />
    </DashboardPanel>
  );
}
