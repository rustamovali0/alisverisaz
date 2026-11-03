import { ThemeManager } from "@/components/admin/cms/theme-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getSiteSettings, getThemeSettings } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  await requireRole(["admin"], "/radmin/themes");
  const [themes, siteSettings] = await Promise.all([
    getThemeSettings(true),
    getSiteSettings(),
  ]);

  return (
    <DashboardPanel
      title="Dizayn"
      description="Saytın temasını seçin, rəngləri və görünüş ayarlarını dəyişin."
    >
      <ThemeManager themes={themes} siteSettings={siteSettings} />
    </DashboardPanel>
  );
}
