import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export default async function AdminSubscriptionsPage() {
  await requireRole(["admin"], "/admin/subscriptions");
  const resource = await getAdminResource("subscriptions");

  return (
    <ResourcePage
      title="Abunəliklər"
      description="subscriptions cədvəlindən oxunan real abunəliklər"
      totalLabel="Abunəlik sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
