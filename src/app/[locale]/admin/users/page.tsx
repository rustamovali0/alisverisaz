import { UserRoleManager } from "@/components/admin/users/user-role-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource, getAdminUsers } from "@/lib/dashboard/data";

export default async function AdminUsersPage() {
  await requireRole(["admin"], "/admin/users");
  const [resource, users] = await Promise.all([
    getAdminResource("users"),
    getAdminUsers(),
  ]);

  return (
    <div className="space-y-6">
      <ResourcePage
        title="İstifadəçilər"
        description="profiles cədvəlindən oxunan real istifadəçilər"
        totalLabel="İstifadəçi sayı"
        total={resource.total}
        items={resource.items}
      />
      <DashboardPanel
        title="Rol idarəetməsi"
        description="Admin istifadəçilərin rolunu müştəri, satıcı və admin olaraq dəyişə bilər."
      >
        <UserRoleManager users={users} />
      </DashboardPanel>
    </div>
  );
}
