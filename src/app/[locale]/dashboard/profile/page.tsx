import { KeyRound } from "lucide-react";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { CustomerProfileForm } from "@/components/dashboard/customer-profile-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const current = await requireRole(["customer", "seller"], "/dashboard/profile");
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
      <CustomerProfileForm
        fullName={profile?.full_name ?? ""}
        email={profile?.email ?? current.user.email ?? ""}
        phone={profile?.phone ?? ""}
      />
      <div className="mt-5 rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black">Şifrə yeniləmə</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Şifrəni dəyişmək üçün bərpa linki email ünvanınıza göndəriləcək.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/forgot-password">Şifrəni yenilə</Link>
          </Button>
        </div>
      </div>
    </DashboardPanel>
  );
}
