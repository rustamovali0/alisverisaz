import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getCustomerResource } from "@/lib/dashboard/data";

export default async function ListingsPage() {
  const current = await requireRole(["customer"], "/dashboard/listings");
  const resource = await getCustomerResource(current.user.id, "listings");

  return (
    <ResourcePage
      title="Elanlarım"
      description="Sizə bağlı mağazalardakı real məhsul qeydləri"
      totalLabel="Elan sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
