import { ThemeManager } from "@/components/admin/cms/theme-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getSiteSettings, getThemeSettings } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function AdminColorsPage() {
  await requireRole(["admin"], "/radmin/colors");
  const [themes, siteSettings] = await Promise.all([
    getThemeSettings(true),
    getSiteSettings(),
  ]);

  return (
    <DashboardPanel
      title="Rənglər"
      description="Saytın əsas rənglərini və bütün düymə rənglərini idarə edin."
    >
      <ThemeManager
        themes={themes}
        siteSettings={siteSettings}
        initialSection="colors"
      />
    </DashboardPanel>
  );
}
