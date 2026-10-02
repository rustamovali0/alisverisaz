import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ProductList } from "@/components/products/product-list";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { deleteProductAction } from "@/lib/products/actions";
import { getManagedProducts } from "@/lib/products/data";
import { getSellerPromotionRequests } from "@/lib/promotions/data";

export const dynamic = "force-dynamic";

export default async function StoreProductsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/products");
  const enabled = await getSellerFeatureAccess(current.user.id, "products");

  if (!enabled) {
    return <FeatureBlocked title="Məhsullar" />;
  }

  const stores = await getOwnedStores(current.user.id).catch((error) => {
    console.error("Seller stores could not be loaded for products page", error);
    return [];
  });
  const [products, promotionRequests] = await Promise.all([
    getManagedProducts({
      storeIds: stores.map((store) => store.id),
      listingType: "store",
    }).catch((error) => {
      console.error("Seller products could not be loaded for products page", error);
      return [];
    }),
    getSellerPromotionRequests(current.user.id).catch((error) => {
      console.error("Seller promotions could not be loaded for products page", error);
      return [];
    }),
  ]);
  const now = Date.now();
  const promotedProductIds = promotionRequests
    .filter(
      (request) =>
        request.status === "approved" &&
        request.productId &&
        request.startsAt &&
        Date.parse(request.startsAt) <= now &&
        (!request.endsAt || Date.parse(request.endsAt) > now),
    )
    .map((request) => request.productId!);

  return (
    <DashboardPanel
      title="Məhsullar"
      description="Mağazalarınıza bağlı real məhsulları redaktə edin və ya silin."
    >
      <ProductList
        products={products}
        categories={[]}
        imageLimit={5}
        editHrefBase="/store/dashboard/products"
        promotedProductIds={promotedProductIds}
        deleteAction={deleteProductAction}
        emptyTitle="Məhsul yoxdur"
        emptyDescription="Yeni məhsul əlavə etdikcə burada görünəcək."
      />
    </DashboardPanel>
  );
}
