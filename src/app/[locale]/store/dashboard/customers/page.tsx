import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getStoreResource } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function StoreCustomersPage() {
  const current = await requireRole(["seller"], "/store/dashboard/customers");
  const enabled = await getSellerFeatureAccess(current.user.id, "customers");

  if (!enabled) {
    return <FeatureBlocked title="Müştərilər" />;
  }

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
