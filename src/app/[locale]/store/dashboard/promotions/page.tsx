import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { SellerPromotionManager } from "@/components/promotions/seller-promotion-manager";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getManagedProducts } from "@/lib/products/data";
import { getSellerPromotionRequests } from "@/lib/promotions/data";

export const dynamic = "force-dynamic";

export default async function SellerPromotionsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/promotions");
  const enabled = await getSellerFeatureAccess(current.user.id, "products");

  if (!enabled) {
    return <FeatureBlocked title="Önə çıxarma" />;
  }

  const stores = await getOwnedStores(current.user.id);
  const [products, requests] = await Promise.all([
    getManagedProducts({
      storeIds: stores.map((store) => store.id),
      listingType: "store",
    }),
    getSellerPromotionRequests(current.user.id),
  ]);

  return (
    <DashboardPanel
      title="Önə çıxarma"
      description="Mağazanızı və ya məhsulunuzu önə çıxarmaq üçün sorğu göndərin. Ödənişi admin təsdiqlədikdən sonra aktiv olacaq."
    >
      <SellerPromotionManager stores={stores} products={products} requests={requests} />
    </DashboardPanel>
  );
}
