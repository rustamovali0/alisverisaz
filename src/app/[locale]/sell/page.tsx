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
  const [stores, categories] = await Promise.all([
    getOwnedStores(current.user.id),
    getCategoryOptions(),
  ]);
  const [locations, limit] = await Promise.all([
    getLocationsForStores(stores.map((store) => store.id)),
    stores[0] ? canCreateListing(stores[0].id) : Promise.resolve(null),
  ]);
  const firstStore = stores[0];
  const productLimit = limit?.subscription?.productLimit ?? 100;
  const remainingListings = limit?.subscription?.remainingListings ?? 0;
  const imageLimit = limit?.subscription?.imagesPerProductLimit ?? 5;

  return (
    <main className="container max-w-5xl py-6 pb-28 md:py-10 md:pb-12">
      <DashboardPanel
        title="Yeni məhsul əlavə et"
        description="Məhsul məlumatlarını doldurun və mağazanızda yayımlayın."
      >
        <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {firstStore
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
          disabled={!firstStore || !limit?.allowed}
          imageLimit={imageLimit}
        />
      </DashboardPanel>
    </main>
  );
}
