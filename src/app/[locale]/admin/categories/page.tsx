import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export default async function AdminCategoriesPage() {
  await requireRole(["admin"], "/admin/categories");
  const resource = await getAdminResource("categories");

  return (
    <ResourcePage
      title="Kateqoriyalar"
      description="Real Supabase category cədvəlindən oxunan kateqoriyalar"
      totalLabel="Kateqoriya sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
