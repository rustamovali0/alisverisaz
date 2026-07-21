import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getStoreResource } from "@/lib/dashboard/data";

export default async function StoreSubscriptionPage() {
  const current = await requireRole(["seller"], "/store/dashboard/subscription");
  const resource = await getStoreResource(current.user.id, "subscriptions");

  return (
    <ResourcePage
      title="Abunəlik"
      description="Mağazalarınıza bağlı real abunəlik qeydləri"
      totalLabel="Abunəlik sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
