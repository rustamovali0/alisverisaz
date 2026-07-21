import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export default async function AdminProductsPage() {
  await requireRole(["admin"], "/admin/products");
  const resource = await getAdminResource("products");

  return (
    <ResourcePage
      title="Məhsullar"
      description="products cədvəlindən oxunan real məhsullar"
      totalLabel="Məhsul sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
