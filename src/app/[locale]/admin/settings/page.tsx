import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AccountLanguageSettings } from "@/components/i18n/account-language-settings";
import { DepositSettingsForm } from "@/components/settings/deposit-settings-form";
import { requireRole } from "@/lib/auth/session";
import { getDepositSettings } from "@/lib/settings/data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole(["admin"], "/radmin/settings");
  const depositSettings = await getDepositSettings();

  return (
    <DashboardPanel
      title="Sistem ayarları"
      description="Platforma səviyyəsində qlobal ayarları idarə edin."
    >
      <div className="grid gap-5">
        <AccountLanguageSettings embedded />
        <DepositSettingsForm enabled={depositSettings.enabled} />
      </div>
    </DashboardPanel>
  );
}
