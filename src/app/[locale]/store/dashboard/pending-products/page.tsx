import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ProductList } from "@/components/products/product-list";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getLocationsForStores } from "@/lib/locations/data";
import { getCategoryOptions, getManagedProducts } from "@/lib/products/data";
import { getStoreEntitlements } from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";

export default async function StorePendingProductsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/pending-products");
  const enabled = await getSellerFeatureAccess(current.user.id, "products");

  if (!enabled) {
    return <FeatureBlocked title="Məhsullar" />;
  }

  let setupError = false;
  const [stores, categories] = await Promise.all([
    getOwnedStores(current.user.id).catch((error) => {
      console.error("Seller stores could not be loaded for pending products", error);
      setupError = true;
      return [];
    }),
    getCategoryOptions().catch((error) => {
      console.error("Product categories could not be loaded for pending products", error);
      setupError = true;
      return [];
    }),
  ]);
  const storeIds = stores.map((store) => store.id);
  const [products, locations] = await Promise.all([
    getManagedProducts({
      storeIds,
      listingType: "store",
      approvalStatus: "pending",
    }).catch(() => []),
    getLocationsForStores(storeIds).catch(() => []),
  ]);
  const firstStoreId = products[0]?.storeId ?? storeIds[0] ?? null;
  const entitlements = firstStoreId
    ? await getStoreEntitlements(firstStoreId).catch((error) => {
        console.error("Store entitlements could not be loaded for pending products", error);
        setupError = true;
        return null;
      })
    : null;

  return (
    <DashboardPanel
      title="Təsdiq gözləyən məhsullar"
      description="Bu məhsullar yoxlanılır və admin təsdiqindən sonra saytda dərc olunacaq."
    >
      {setupError ? (
        <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Məhsul məlumatlarının bir hissəsi yüklənmədi. Səhifəni yeniləyib yenidən cəhd edin.
        </div>
      ) : null}
      <ProductList
        products={products}
        categories={categories}
        locations={locations}
        imageLimit={entitlements?.imagesPerProductLimit ?? 5}
        editHref={(product) => `/store/dashboard/products/${product.id}/edit`}
        emptyTitle="Təsdiq gözləyən məhsul yoxdur"
        emptyDescription="Təsdiqə göndərilən məhsullar burada görünəcək."
      />
    </DashboardPanel>
  );
}
