import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export default async function AdminOrdersPage() {
  await requireRole(["admin"], "/admin/orders");
  const resource = await getAdminResource("orders");

  return (
    <ResourcePage
      title="Sifarişlər"
      description="orders cədvəlindən oxunan real sifarişlər"
      totalLabel="Sifariş sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
