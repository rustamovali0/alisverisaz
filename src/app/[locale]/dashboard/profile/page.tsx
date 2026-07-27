import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { CustomerProfileForm } from "@/components/dashboard/customer-profile-form";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const current = await requireRole(["customer"], "/dashboard/profile");
  const profile = current.profile;

  return (
    <DashboardPanel
      title="Profil"
      description="Ad, email və telefon məlumatlarınızı yeniləyin."
    >
      <CustomerProfileForm
        fullName={profile?.full_name ?? ""}
        email={profile?.email ?? current.user.email ?? ""}
        phone={profile?.phone ?? ""}
      />
    </DashboardPanel>
  );
}
