import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/products/product-editor";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { getAdminStoreDetail } from "@/lib/cms/data";
import {
  getLocationsForStores,
  getProductLocationMap,
} from "@/lib/locations/data";
import { getCategoryOptions, getManagedProducts } from "@/lib/products/data";
import { isProfitTrackingEnabled } from "@/lib/products/profit";
import { getStoreEntitlements } from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  await requireRole(["admin"], `/radmin/products/${productId}/edit`);
  if (
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      productId,
    )
  )
    notFound();
  const [product] = await getManagedProducts({
    productId,
    listingType: "store",
  });
  if (!product) notFound();
  const [categories, detail, locations, productLocations, entitlements] =
    await Promise.all([
      getCategoryOptions(),
      getAdminStoreDetail(product.storeId),
      getLocationsForStores([product.storeId]),
      getProductLocationMap([product.id]),
      getStoreEntitlements(product.storeId),
    ]);
  if (!detail.store) notFound();
  return (
    <ProductEditor title="Satıcının məhsulunu redaktə et">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="font-semibold">{product.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mağaza: {detail.store.name} · RAdmin redaktəsi
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/radmin/stores/${product.storeId}#store-products`}>
            Mağazanın məhsullarına qayıt
          </Link>
        </Button>
      </div>
      <ProductForm
        mode="edit"
        adminMode
        standalone
        product={product}
        categories={categories}
        locations={locations}
        productLocations={productLocations.get(product.id) ?? []}
        imageLimit={entitlements.imagesPerProductLimit}
        profitTrackingEnabled={isProfitTrackingEnabled(detail.store.settings)}
      />
    </ProductEditor>
  );
}
