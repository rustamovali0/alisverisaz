import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { PromoCodesManager } from "@/components/promos/promo-codes-manager";
import { requireRole } from "@/lib/auth/session";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getSellerPromoCodes } from "@/lib/promos/data";

export const dynamic = "force-dynamic";

export default async function SellerPromosPage() {
  const current = await requireRole(["seller"], "/store/dashboard/promos");
  const [stores, promos] = await Promise.all([
    getOwnedStores(current.user.id),
    getSellerPromoCodes(current.user.id),
  ]);

  return (
    <DashboardPanel
      title="Promo kodlar"
      description="Mağazanıza aid promo kodları yaradın və idarə edin."
    >
      <PromoCodesManager mode="seller" stores={stores} promos={promos} />
    </DashboardPanel>
  );
}
