import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getStoreResource } from "@/lib/dashboard/data";

export default async function StoreProductsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/products");
  const resource = await getStoreResource(current.user.id, "products");

  return (
    <ResourcePage
      title="Məhsullar"
      description="Mağazalarınıza bağlı real məhsullar"
      totalLabel="Məhsul sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
