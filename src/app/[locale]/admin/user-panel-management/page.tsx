import { PanelSettingsForm } from "@/components/admin/cms/panel-settings-form";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getPanelSettings } from "@/lib/cms/data";

export default async function AdminUserPanelManagementPage() {
  await requireRole(["admin"], "/admin/user-panel-management");
  const settings = await getPanelSettings("user");

  return (
    <DashboardPanel
      title="İstifadəçi paneli idarəsi"
      description="Fərdi istifadəçi paneli feature-lərini, sidebar strukturunu və empty state ayarlarını idarə edin."
    >
      <PanelSettingsForm kind="user" settings={settings} />
    </DashboardPanel>
  );
}
