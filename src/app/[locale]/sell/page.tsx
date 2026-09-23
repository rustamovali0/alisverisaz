import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { ProductForm } from "@/components/products/product-form";
import { requireRole } from "@/lib/auth/session";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getLocationsForStores } from "@/lib/locations/data";
import { getCategoryOptions } from "@/lib/products/data";
import { canCreateListing } from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";

export default async function SellProductPage() {
  const current = await requireRole(["seller"], "/sell");
  let setupError = false;
  const [stores, categories] = await Promise.all([
    getOwnedStores(current.user.id).catch((error) => {
      console.error("Seller stores could not be loaded for product create", error);
      setupError = true;
      return [];
    }),
    getCategoryOptions().catch((error) => {
      console.error("Product categories could not be loaded for product create", error);
      setupError = true;
      return [];
    }),
  ]);
  const firstStore = stores[0];
  const [locations, limit] = await Promise.all([
    getLocationsForStores(stores.map((store) => store.id)).catch((error) => {
      console.error("Store locations could not be loaded for product create", error);
      return [];
    }),
    firstStore
      ? canCreateListing(firstStore.id).catch((error) => {
          console.error("Product limit could not be loaded for product create", error);
          setupError = true;
          return null;
        })
      : Promise.resolve(null),
  ]);
  const productLimit = limit?.subscription?.productLimit ?? 100;
  const remainingListings = limit?.subscription?.remainingListings ?? 0;
  const imageLimit = limit?.subscription?.imagesPerProductLimit ?? 5;
  const isFormDisabled =
    setupError || categories.length === 0 || !firstStore || !limit?.allowed;

  return (
    <main className="container max-w-5xl py-6 pb-28 md:py-10 md:pb-12">
      <DashboardPanel
        title="Yeni məhsul əlavə et"
        description="Məhsul məlumatlarını doldurun və mağazanızda yayımlayın."
      >
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
    </main>
  );
}
