import { notFound } from "next/navigation";

import { StoreManagementForm } from "@/components/admin/cms/store-management-form";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { StatGrid } from "@/components/dashboard/stat-card";
import { requireRole } from "@/lib/auth/session";
import { getAdminStoreDetail } from "@/lib/cms/data";

type AdminStoreDetailPageProps = {
  params: Promise<{
    storeId: string;
  }>;
};

export default async function AdminStoreDetailPage({
  params,
}: AdminStoreDetailPageProps) {
  await requireRole(["admin"], "/admin/stores");
  const { storeId } = await params;
  const detail = await getAdminStoreDetail(storeId);

  if (!detail.store) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          {
            label: "Məhsul sayı",
            value: detail.productCount,
            description: detail.store.name,
          },
          {
            label: "Status",
            value: detail.store.status,
            description: detail.store.slug,
          },
        ]}
      />
      <DashboardPanel
        title={detail.store.name}
        description="Mağaza statusu, store settings və panel feature override-ları"
      >
        <StoreManagementForm
          store={detail.store}
          panelSettings={detail.settings}
        />
      </DashboardPanel>
    </div>
  );
}
