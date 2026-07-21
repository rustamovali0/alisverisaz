import { ThemeManager } from "@/components/admin/cms/theme-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getThemeSettings } from "@/lib/cms/data";

export default async function AdminThemesPage() {
  await requireRole(["admin"], "/admin/themes");
  const themes = await getThemeSettings(true);

  return (
    <DashboardPanel
      title="Ana səhifə temaları"
      description="Default, Modern Marketplace, Luxury Commerce, Minimal Storefront və Bold Catalog temalarını preview edin və publish edin."
    >
      <ThemeManager themes={themes} />
    </DashboardPanel>
  );
}
