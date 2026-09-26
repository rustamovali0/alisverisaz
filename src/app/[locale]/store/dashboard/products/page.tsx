import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ProductForm } from "@/components/products/product-form";
import { ProductList } from "@/components/products/product-list";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getLocationsForStores } from "@/lib/locations/data";
import { deleteProductAction } from "@/lib/products/actions";
import { getCategoryOptions, getManagedProducts } from "@/lib/products/data";
import { canCreateListing } from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";

export default async function StoreProductsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/products");
  const enabled = await getSellerFeatureAccess(current.user.id, "products");

  if (!enabled) {
    return <FeatureBlocked title="Məhsullar" />;
  }

  let setupError = false;
  const [stores, categories] = await Promise.all([
    getOwnedStores(current.user.id).catch((error) => {
      console.error("Seller stores could not be loaded for products page", error);
      setupError = true;
      return [];
    }),
    getCategoryOptions().catch((error) => {
      console.error("Product categories could not be loaded for products page", error);
      setupError = true;
      return [];
    }),
  ]);
  const storeIds = stores.map((store) => store.id);
  const [products, locations] = await Promise.all([
    getManagedProducts({
      storeIds,
      listingType: "store",
    }).catch(() => []),
    getLocationsForStores(storeIds).catch(() => []),
  ]);
  const firstStore = stores[0];
  const limit = firstStore
    ? await canCreateListing(firstStore.id).catch((error) => {
        console.error("Product limit could not be loaded for products page", error);
        setupError = true;
        return null;
      })
    : null;
  const productLimit = limit?.subscription?.productLimit ?? 100;
  const remainingListings = limit?.subscription?.remainingListings ?? 0;
  const imageLimit = limit?.subscription?.imagesPerProductLimit ?? 5;
  const isFormDisabled =
    setupError || categories.length === 0 || !firstStore || !limit?.allowed;

  return (
    <div className="space-y-6">
      <DashboardPanel
        title="Yeni məhsul"
        description="Mağazanıza yeni məhsul əlavə edin."
      >
        <div id="create-product" className="scroll-mt-24" />
        <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {setupError || categories.length === 0
            ? "Məhsul əlavə etmək üçün lazım olan məlumatlar tam yüklənmədi. Səhifəni yeniləyib yenidən cəhd edin."
            : firstStore
            ? limit?.allowed
              ? productLimit === null
                ? "Məhsul limiti limitsizdir."
                : `${remainingListings} elan limitiniz qalıb`
              : "Limitiniz dolub"
            : "Məhsul əlavə etmək üçün əvvəl mağaza yaradılmalıdır."}
        </div>
        <ProductForm
          mode="store-create"
          categories={categories}
          stores={stores}
          locations={locations}
          disabled={isFormDisabled}
          imageLimit={imageLimit}
        />
      </DashboardPanel>

      <DashboardPanel
        title="Məhsullar"
        description="Mağazalarınıza bağlı real məhsulları redaktə edin və ya silin."
      >
        <ProductList
          products={products}
          categories={categories}
          imageLimit={imageLimit}
          editHref={(product) => `/store/dashboard/products/${product.id}/edit`}
          deleteAction={deleteProductAction}
          emptyTitle="Məhsul yoxdur"
          emptyDescription={
            limit?.allowed
              ? "Yeni məhsul əlavə etdikcə burada görünəcək."
              : "Məhsul yaratmaq üçün limitdə boş yer lazımdır."
          }
        />
      </DashboardPanel>
    </div>
  );
}
