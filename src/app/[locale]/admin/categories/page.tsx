import { CategoryManager } from "@/components/admin/categories/category-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getAdminCategories } from "@/lib/categories/data";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireRole(["admin"], "/radmin/categories");
  const { total, categories } = await getAdminCategories();

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          {
            label: "Kateqoriya sayı",
            value: total,
            description: "Real Supabase category cədvəlindən oxunan kateqoriyalar",
          },
        ]}
      />
      <DashboardPanel
        title="Kateqoriyalar"
        description="Kateqoriyaları yaradın, redaktə edin, aktiv/deaktiv edin və sıra verin."
      >
        <CategoryManager categories={categories} />
      </DashboardPanel>
    </div>
  );
}
