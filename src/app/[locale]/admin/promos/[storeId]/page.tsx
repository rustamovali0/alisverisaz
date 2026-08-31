import { notFound } from "next/navigation";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { PromoCodesManager } from "@/components/promos/promo-codes-manager";
import { requireRole } from "@/lib/auth/session";
import { getAdminPromoCodesForStore } from "@/lib/promos/data";

type AdminStorePromosPageProps = {
  params: Promise<{
    storeId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminStorePromosPage({
  params,
}: AdminStorePromosPageProps) {
  await requireRole(["admin"], "/radmin/promos");
  const { storeId } = await params;
  const { store, promos } = await getAdminPromoCodesForStore(storeId);

  if (!store) {
    notFound();
  }

  return (
    <DashboardPanel
      title={`${store.name ?? "Mağaza"} promo kodları`}
      description="Bu satıcı üçün promo kod yaradın, redaktə edin və deaktiv edin."
    >
      <PromoCodesManager
        mode="admin"
        stores={[{ id: store.id, name: store.name ?? "Mağaza" }]}
        promos={promos}
      />
    </DashboardPanel>
  );
}
