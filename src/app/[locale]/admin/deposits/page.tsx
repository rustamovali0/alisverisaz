import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function AdminDepositsPage() {
  await requireRole(["admin"], "/radmin/deposits");
  const resource = await getAdminResource("deposits");

  return (
    <ResourcePage
      title="Beh sifarişləri"
      description="deposits cədvəlindən oxunan real beh sifarişləri"
      totalLabel="Beh sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
