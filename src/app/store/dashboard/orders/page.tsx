import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getStoreResource } from "@/lib/dashboard/data";

export default async function StoreOrdersPage() {
  const current = await requireRole(["seller"], "/store/dashboard/orders");
  const resource = await getStoreResource(current.user.id, "orders");

  return (
    <ResourcePage
      title="Sifarişlər"
      description="Mağazalarınıza bağlı real sifarişlər"
      totalLabel="Sifariş sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
