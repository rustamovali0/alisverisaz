import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { DepositList } from "@/components/deposits/deposit-list";
import { requireRole } from "@/lib/auth/session";
import { getSellerDeposits } from "@/lib/deposits/data";

export default async function StoreDepositsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/deposits");
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
