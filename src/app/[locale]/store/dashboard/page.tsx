import { EmptyState } from "@/components/common/empty-state";
import { SellerDashboardOverview } from "@/components/seller/seller-dashboard-overview";
import { requireRole } from "@/lib/auth/session";
import { getSellerDashboardOverview } from "@/lib/seller-dashboard/data";

export const dynamic = "force-dynamic";

export default async function StoreDashboardPage() {
  const current = await requireRole(["seller"], "/store/dashboard");
  const overview = await getSellerDashboardOverview(current.user.id);

  return (
    <div className="space-y-6">
      <SellerDashboardOverview overview={overview} />
      {overview.stores.length === 0 ? (
        <EmptyState
          className="rounded-md border bg-card p-8 shadow-sm"
          title="Mağaza yoxdur"
          description="Bu hesaba bağlı mağaza yaradıldıqda panel real məlumatlarla dolacaq."
        />
      ) : null}
    </div>
  );
}
