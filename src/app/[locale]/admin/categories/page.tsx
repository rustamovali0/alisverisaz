import { CategoryManager } from "@/components/admin/categories/category-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getAdminCategories } from "@/lib/categories/data";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireRole(["admin"], "/radmin/categories");
  const { total, categories } = await getAdminCategories();

  return (
    <div className="space-y-6">
      <DashboardPanel
        title={`Kateqoriyalar (${total})`}
        description="Kateqoriyaları yaradın, redaktə edin, aktiv/deaktiv edin və sıra verin."
      >
        <CategoryManager categories={categories} />
      </DashboardPanel>
    </div>
  );
}
