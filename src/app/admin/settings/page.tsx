import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export default async function AdminSettingsPage() {
  await requireRole(["admin"], "/admin/settings");
  const resource = await getAdminResource("settings");

  return (
    <ResourcePage
      title="Sistem ayarları"
      description="Mövcud real mağaza konfiqurasiyalarından oxunan sistem görünüşü"
      totalLabel="Konfiqurasiya sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
