import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getCustomerResource } from "@/lib/dashboard/data";

export default async function CustomerOrdersPage() {
  const current = await requireRole(["customer"], "/dashboard/orders");
  const resource = await getCustomerResource(current.user.id, "orders");

  return (
    <ResourcePage
      title="Sifarişlər"
      description="Hesabınıza bağlı real sifarişlər"
      totalLabel="Sifariş sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
