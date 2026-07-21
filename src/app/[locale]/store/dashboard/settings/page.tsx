import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getStoreResource } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function StoreSettingsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/settings");
  const enabled = await getSellerFeatureAccess(current.user.id, "settings");

  if (!enabled) {
    return <FeatureBlocked title="Ayarlar" />;
  }

  const resource = await getStoreResource(current.user.id, "settings");

  return (
    <ResourcePage
      title="Ayarlar"
      description="Mağaza ayarları üçün stores cədvəlindən oxunan real qeydlər"
      totalLabel="Mağaza sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
