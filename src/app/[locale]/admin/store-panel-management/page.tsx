import { PanelSettingsForm } from "@/components/admin/cms/panel-settings-form";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getPanelSettings } from "@/lib/cms/data";

export default async function AdminStorePanelManagementPage() {
  await requireRole(["admin"], "/admin/store-panel-management");
  const settings = await getPanelSettings("store");

  return (
    <DashboardPanel
      title="Satıcı paneli idarəsi"
      description="Satıcı paneli feature-lərini, sidebar strukturunu və təqdimat ayarlarını idarə edin."
    >
      <PanelSettingsForm kind="store" settings={settings} />
    </DashboardPanel>
  );
}
