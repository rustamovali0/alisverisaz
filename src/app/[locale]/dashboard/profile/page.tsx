import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { CustomerProfileForm } from "@/components/dashboard/customer-profile-form";
import { AccountLanguageSettings } from "@/components/i18n/account-language-settings";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const current = await requireRole(["customer"], "/dashboard/profile");
  const enabled = await getCustomerFeatureAccess("profile");

  if (!enabled) {
    return <FeatureBlocked title="Profil" />;
  }

  const profile = current.profile;

  return (
    <DashboardPanel
      title="Profil"
      description="Ad, email və telefon məlumatlarınızı yeniləyin."
    >
      <div className="grid gap-5">
        <AccountLanguageSettings embedded />
        <CustomerProfileForm
          fullName={profile?.full_name ?? ""}
          email={profile?.email ?? current.user.email ?? ""}
          phone={profile?.phone ?? ""}
        />
      </div>
    </DashboardPanel>
  );
}
