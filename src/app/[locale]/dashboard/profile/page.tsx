import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const current = await requireRole(["customer"], "/dashboard/profile");
  const profile = current.profile;

  const fields = [
    ["Ad soyad", profile?.full_name ?? "-"],
    ["Email", profile?.email ?? current.user.email ?? "-"],
    ["Telefon", profile?.phone ?? "-"],
    ["Rol", current.role],
  ];

  return (
    <DashboardPanel
      title="Profil"
      description="Supabase profiles cədvəlindən oxunan hesab məlumatları"
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-md border bg-background p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </DashboardPanel>
  );
}
