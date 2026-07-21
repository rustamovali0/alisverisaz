import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export default async function AdminProductsPage() {
  await requireRole(["admin"], "/admin/products");
  const resource = await getAdminResource("stores");

  return (
    <ResourcePage
      title="Məhsullar üçün mağaza seç"
      description="Məhsullar qarışıq göstərilmir. Mağazaya daxil olub həmin mağazanın məhsullarını idarə edin."
      totalLabel="Mağaza sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
