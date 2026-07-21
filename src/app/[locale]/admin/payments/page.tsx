import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireRole(["admin"], "/radmin/payments");
  const resource = await getAdminResource("payments");

  return (
    <ResourcePage
      title="Ödənişlər"
      description="payments cədvəlindən oxunan placeholder və gələcək ödənişlər"
      totalLabel="Ödəniş sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
