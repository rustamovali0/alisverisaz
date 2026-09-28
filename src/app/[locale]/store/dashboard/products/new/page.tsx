import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getLocationsForStores } from "@/lib/locations/data";
import { getCategoryOptions } from "@/lib/products/data";
import { canCreateListing } from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";

export default async function NewStoreProductPage() {
  const current = await requireRole(["seller"], "/store/dashboard/products/new");
  const enabled = await getSellerFeatureAccess(current.user.id, "products");

  if (!enabled) {
    return <FeatureBlocked title="Məhsullar" />;
  }

  let setupError = false;
  const [stores, categories] = await Promise.all([
    getOwnedStores(current.user.id).catch((error) => {
      console.error("Seller stores could not be loaded for new product page", error);
      setupError = true;
      return [];
    }),
    getCategoryOptions().catch((error) => {
      console.error("Product categories could not be loaded for new product page", error);
      setupError = true;
      return [];
    }),
  ]);
  const storeIds = stores.map((store) => store.id);
  const locations = await getLocationsForStores(storeIds).catch((error) => {
    console.error("Store locations could not be loaded for new product page", error);
    return [];
  });
  const firstStore = stores[0];
  const limit = firstStore
    ? await canCreateListing(firstStore.id).catch((error) => {
        console.error("Product limit could not be loaded for new product page", error);
        setupError = true;
        return null;
      })
    : null;
  const productLimit = limit?.subscription?.productLimit ?? null;
  const remainingListings = limit?.subscription?.remainingListings ?? 0;
  const imageLimit = limit?.subscription?.imagesPerProductLimit ?? 5;
  const isFormDisabled =
    setupError || categories.length === 0 || !firstStore || !limit?.allowed;

  return (
    <DashboardPanel
      title="Yeni məhsul"
      description="Mağazanıza yeni məhsul əlavə edin."
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/store/dashboard/products">Məhsullara qayıt</Link>
        </Button>
      </div>
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
        successRedirect="/store/dashboard/products"
      />
    </DashboardPanel>
  );
}
