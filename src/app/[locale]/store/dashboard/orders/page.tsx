import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { OrderList } from "@/components/orders/order-list";
import { requireRole } from "@/lib/auth/session";
import { getSellerOrders } from "@/lib/orders/data";

export default async function StoreOrdersPage() {
  const current = await requireRole(["seller"], "/store/dashboard/orders");
  const orders = await getSellerOrders(current.user.id);

  return (
    <DashboardPanel
      title="Sifarişlər"
      description="Müştərilərdən gələn real sifarişlər və status idarəsi"
    >
      <OrderList orders={orders} canUpdateStatus />
    </DashboardPanel>
  );
}
