import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getCustomerResource } from "@/lib/dashboard/data";

export default async function CustomerPaymentsPage() {
  const current = await requireRole(["customer"], "/dashboard/payments");
  const resource = await getCustomerResource(current.user.id, "payments");

  return (
    <ResourcePage
      title="Ödənişlər"
      description="Müştəri hesabınıza bağlı real ödənişlər"
      totalLabel="Ödəniş sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
