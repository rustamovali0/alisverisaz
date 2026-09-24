import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ProductForm } from "@/components/products/product-form";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getLocationsForStores, getProductLocationMap } from "@/lib/locations/data";
import { getCategoryOptions, getManagedProducts } from "@/lib/products/data";
import { getStoreEntitlements } from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";

type ProductEditPageProps = {
  params: Promise<{ productId: string }>;
};

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const [{ productId }, current] = await Promise.all([
    params,
    requireRole(["seller"], "/store/dashboard/products"),
  ]);
  const enabled = await getSellerFeatureAccess(current.user.id, "products");

  if (!enabled) {
    return <FeatureBlocked title="Məhsullar" />;
  }

  const stores = await getOwnedStores(current.user.id).catch((error) => {
    console.error("Seller stores could not be loaded for product edit", error);
    return [];
  });
  const product = (
    await getManagedProducts({
      productId,
      storeIds: stores.map((store) => store.id),
      listingType: "store",
    }).catch((error) => {
      console.error("Managed product could not be loaded for edit", error);
      return [];
    })
  )[0];

  if (!product) {
    notFound();
  }

  let setupError = false;
  const [categories, locations, productLocationMap, entitlements] = await Promise.all([
    getCategoryOptions().catch((error) => {
      console.error("Product categories could not be loaded for product edit", error);
      setupError = true;
      return [];
    }),
    getLocationsForStores([product.storeId]).catch((error) => {
      console.error("Store locations could not be loaded for product edit", error);
      return [];
    }),
    getProductLocationMap([product.id]).catch((error) => {
      console.error("Product location map could not be loaded for product edit", error);
      return new Map();
    }),
    getStoreEntitlements(product.storeId).catch((error) => {
      console.error("Store entitlements could not be loaded for product edit", error);
      setupError = true;
      return {
        storeId: product.storeId,
        productLimit: null,
        imagesPerProductLimit: 5,
        productCount: 0,
        remainingProducts: null,
      };
    }),
  ]);

  return (
    <DashboardPanel
      title="Məhsulu redaktə et"
      description="Məlumatları yeniləyin və saxladıqdan sonra məhsullarınıza qayıdın."
    >
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/store/dashboard/products">Məhsullara qayıt</Link>
        </Button>
      </div>
      {product.approvalStatus === "pending" ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Məhsul yoxlanılır, təsdiqdən sonra dərc olunacaq.
        </div>
      ) : null}
      {product.approvalStatus === "rejected" && product.approvalNote ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {product.approvalNote}
        </div>
      ) : null}
      {setupError || categories.length === 0 ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Məhsul redaktəsi üçün lazım olan məlumatlar tam yüklənmədi. Səhifəni yeniləyib yenidən cəhd edin.
        </div>
      ) : null}
      <ProductForm
        mode="edit"
        categories={categories}
        product={product}
        locations={locations}
        productLocations={productLocationMap.get(product.id) ?? []}
        imageLimit={entitlements.imagesPerProductLimit ?? 5}
        disabled={setupError || categories.length === 0}
        successRedirect="/store/dashboard/products"
      />
    </DashboardPanel>
  );
}
