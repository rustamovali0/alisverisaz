import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export default async function AdminUsersPage() {
  await requireRole(["admin"], "/admin/users");
  const resource = await getAdminResource("users");

  return (
    <ResourcePage
      title="İstifadəçilər"
      description="profiles cədvəlindən oxunan real istifadəçilər"
      totalLabel="İstifadəçi sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
