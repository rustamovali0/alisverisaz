import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireRole(["admin"], "/radmin/categories");
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
