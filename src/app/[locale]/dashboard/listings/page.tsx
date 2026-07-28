import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ProductForm } from "@/components/products/product-form";
import { ProductList } from "@/components/products/product-list";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";
import { getCategoryOptions, getManagedProducts } from "@/lib/products/data";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const current = await requireRole(["customer"], "/dashboard/listings");
  const enabled = await getCustomerFeatureAccess("listings");

  if (!enabled) {
    return <FeatureBlocked title="Elanlarım" />;
  }

  const [categories, products] = await Promise.all([
    getCategoryOptions(),
    getManagedProducts({
      ownerId: current.user.id,
      listingType: "personal",
    }),
  ]);

  return (
    <div className="space-y-6">
      <DashboardPanel
        title="Yeni elan"
        description="Fərdi elan real ödəniş təsdiqindən sonra aktivləşir."
      >
        <ProductForm mode="personal-create" categories={categories} />
      </DashboardPanel>
      <DashboardPanel
        title="Elanlarım"
        description="Fərdi elanlarınızı redaktə edin və ödəniş statusunu izləyin."
      >
        <ProductList
          products={products}
          categories={categories}
          emptyTitle="Elan yoxdur"
          emptyDescription="Yeni elan yerləşdirdikcə burada görünəcək."
          allowPaymentActivation
        />
      </DashboardPanel>
    </div>
  );
}
