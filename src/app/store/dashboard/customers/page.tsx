import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getStoreResource } from "@/lib/dashboard/data";

export default async function StoreCustomersPage() {
  const current = await requireRole(["seller"], "/store/dashboard/customers");
  const resource = await getStoreResource(current.user.id, "customers");

  return (
    <ResourcePage
      title="Müştərilər"
      description="Mağazalarınıza bağlı real müştəri qeydləri"
      totalLabel="Müştəri sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
