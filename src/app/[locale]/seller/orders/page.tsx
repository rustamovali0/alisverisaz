import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { OrderList } from "@/components/orders/order-list";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getSellerOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function SellerOrdersPage() {
  const current = await requireRole(["seller"], "/seller/orders");
  const enabled = await getSellerFeatureAccess(current.user.id, "orders");

  if (!enabled) {
    return <main className="container max-w-6xl py-6 pb-28 md:py-10 md:pb-12"><FeatureBlocked title="Sifarişlər" /></main>;
  }

  const orders = await getSellerOrders(current.user.id);

  return (
    <main className="container max-w-6xl py-6 pb-28 md:py-10 md:pb-12">
      <DashboardPanel
        title="Sifarişlər"
        description="Müştərilərdən gələn real sifarişlər və status idarəsi"
      >
        <OrderList orders={orders} canUpdateStatus canDelete viewerRole="seller" />
      </DashboardPanel>
    </main>
  );
}
