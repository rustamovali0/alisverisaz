import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getStoreResource } from "@/lib/dashboard/data";

export default async function StoreSettingsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/settings");
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
