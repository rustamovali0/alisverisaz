import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { DepositList } from "@/components/deposits/deposit-list";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getSellerDeposits } from "@/lib/deposits/data";

export const dynamic = "force-dynamic";

export default async function StoreDepositsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/deposits");
  const enabled = await getSellerFeatureAccess(current.user.id, "deposits");

  if (!enabled) {
    return <FeatureBlocked title="Beh sifarişləri" />;
  }

  const deposits = await getSellerDeposits(current.user.id);

  return (
    <DashboardPanel
      title="Beh sifarişləri"
      description="Müştəri, telefon, məhsul, beh məbləği və qalan məbləğ"
    >
      <DepositList deposits={deposits} />
    </DashboardPanel>
  );
}
