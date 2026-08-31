import { NewProductApprovalsManager } from "@/components/admin/products/new-product-approvals-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getPendingProductApprovals } from "@/lib/products/approval-data";
import { getCategoryOptions, getManagedProducts } from "@/lib/products/data";

export const dynamic = "force-dynamic";

export default async function AdminNewProductsPage() {
  await requireRole(["admin"], "/radmin/new-products");
  const approval = await getPendingProductApprovals();
  const [managedProducts, categories] = await Promise.all([
    approval.products.length > 0
      ? getManagedProducts({
          listingType: "store",
          approvalStatus: "pending",
        })
      : Promise.resolve([]),
    getCategoryOptions(),
  ]);

  return (
    <DashboardPanel
      title="Yeni məhsullar"
      description="Satıcıların yeni məhsullarını təsdiq edin və dərc qaydasını idarə edin."
    >
      <NewProductApprovalsManager
        settings={approval.settings}
        products={approval.products}
        managedProducts={managedProducts}
        categories={categories}
      />
    </DashboardPanel>
  );
}
