import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { OrderList } from "@/components/orders/order-list";
import { requireRole } from "@/lib/auth/session";
import { getAdminOrders } from "@/lib/orders/data";

export default async function AdminOrdersPage() {
  await requireRole(["admin"], "/admin/orders");
  const orders = await getAdminOrders();

  return (
    <DashboardPanel
      title="Sifarişlər"
      description="Bütün real sifarişlər və status idarəsi"
    >
      <OrderList orders={orders} canUpdateStatus />
    </DashboardPanel>
  );
}
