import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { SiteSettingsForm } from "@/components/admin/cms/site-settings-form";
import { requireRole } from "@/lib/auth/session";
import { getSiteSettings, getThemeSettings } from "@/lib/cms/data";

export default async function AdminSiteManagementPage() {
  await requireRole(["admin"], "/admin/site-management");
  const [settings, themes] = await Promise.all([
    getSiteSettings(),
    getThemeSettings(true),
  ]);

  return (
    <DashboardPanel
      title="Sayt idarəetməsi"
      description="Logo, SEO, əlaqə, qeydiyyat, beh və aktiv ana səhifə temasını idarə edin."
    >
      <SiteSettingsForm settings={settings} themes={themes} />
    </DashboardPanel>
  );
}
