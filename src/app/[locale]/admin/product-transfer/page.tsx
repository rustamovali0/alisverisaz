import { ProductTransferManager } from "@/components/admin/products/product-transfer-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getProductTransferData } from "@/lib/products/admin-transfer";

export const dynamic = "force-dynamic";

export default async function AdminProductTransferPage() {
  await requireRole(["admin"], "/radmin/product-transfer");
  const data = await getProductTransferData();

  return (
    <DashboardPanel
      title="Məhsulları mağazalar arasında köçür"
      description="Bir satıcının bir və ya bir neçə məhsulunu seçib başqa mağazaya verin. Köhnə sifariş və mesaj tarixçəsi əvvəlki mağazada qalır."
    >
      <ProductTransferManager stores={data.stores} products={data.products} />
    </DashboardPanel>
  );
}
