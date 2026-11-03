import { UserRoleManager } from "@/components/admin/users/user-role-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getAdminUsers } from "@/lib/dashboard/data";
export const dynamic = "force-dynamic";
export default async function AdminUsersPage() {
  await requireRole(["admin"], "/radmin/users");
  const users = await getAdminUsers();
  return (
    <DashboardPanel
      title={`İstifadəçilər (${users.length})`}
      description="İstifadəçini tapın və məlumatlarını idarə edin."
    >
      <UserRoleManager users={users} />
    </DashboardPanel>
  );
}
