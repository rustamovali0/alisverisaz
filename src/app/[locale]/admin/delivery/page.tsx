import { AdminDeliverySettingsForm } from "@/components/delivery/admin-delivery-settings-form";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import {
  getDeliverySettings,
  getDeliveryStoreOverrides,
} from "@/lib/delivery/data";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryPage() {
  await requireRole(["admin"], "/radmin/delivery");
  const [settings, overrides] = await Promise.all([
    getDeliverySettings(),
    getDeliveryStoreOverrides(),
  ]);

  return (
    <DashboardPanel
      title="Çatdırılma sistemi"
      description="Qlobal çatdırılma qaydalarını və mağaza üzrə override-ları idarə edin."
    >
      <AdminDeliverySettingsForm settings={settings} overrides={overrides} />
    </DashboardPanel>
  );
}
