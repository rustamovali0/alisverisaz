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

  const stores = await getOwnedStores(current.user.id);
  const product = (
    await getManagedProducts({
      productId,
      storeIds: stores.map((store) => store.id),
      listingType: "store",
    })
  )[0];

  if (!product) {
    notFound();
  }

  const [categories, locations, productLocationMap, entitlements] = await Promise.all([
    getCategoryOptions(),
    getLocationsForStores([product.storeId]),
    getProductLocationMap([product.id]),
    getStoreEntitlements(product.storeId),
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
      <ProductForm
        mode="edit"
        categories={categories}
        product={product}
        locations={locations}
        productLocations={productLocationMap.get(product.id) ?? []}
        imageLimit={entitlements.imagesPerProductLimit ?? 5}
        successRedirect="/store/dashboard/products"
      />
    </DashboardPanel>
  );
}
