import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ProductForm } from "@/components/products/product-form";
import { ProductList } from "@/components/products/product-list";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getCategoryOptions, getManagedProducts } from "@/lib/products/data";
import { canCreateListing } from "@/lib/subscriptions/data";

export default async function StoreProductsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/products");
  const enabled = await getSellerFeatureAccess(current.user.id, "products");

  if (!enabled) {
    return <FeatureBlocked title="Məhsullar" />;
  }

  const [stores, categories] = await Promise.all([
    getOwnedStores(current.user.id),
    getCategoryOptions(),
  ]);
  const products = await getManagedProducts({
    storeIds: stores.map((store) => store.id),
    listingType: "store",
  });
  const firstStore = stores[0];
  const limit = firstStore ? await canCreateListing(firstStore.id) : null;

  return (
    <div className="space-y-6">
      <DashboardPanel
        title="Yeni məhsul"
        description="Məhsul əlavə etmək üçün aktiv subscription və boş elan limiti lazımdır."
      >
        <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {firstStore
            ? limit?.allowed
              ? `Qalan elan limiti: ${limit.subscription?.remainingListings ?? 0}`
              : "Aktiv plan yoxdur və ya elan limiti bitib."
            : "Məhsul əlavə etmək üçün əvvəl mağaza yaradılmalıdır."}
        </div>
        <ProductForm
          mode="store-create"
          categories={categories}
          stores={stores}
          disabled={!firstStore || !limit?.allowed}
        />
      </DashboardPanel>

      <DashboardPanel
        title="Məhsullar"
        description="Mağazalarınıza bağlı real məhsulları redaktə edin və ya silin."
      >
        <ProductList
          products={products}
          categories={categories}
          emptyTitle="Məhsul yoxdur"
          emptyDescription={
            limit?.allowed
              ? "Yeni məhsul əlavə etdikcə burada görünəcək."
              : "Məhsul yaratmaq üçün aktiv plan və elan limiti lazımdır."
          }
        />
      </DashboardPanel>
    </div>
  );
}
