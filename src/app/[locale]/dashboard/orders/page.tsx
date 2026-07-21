import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { OrderList } from "@/components/orders/order-list";
import { requireRole } from "@/lib/auth/session";
import { getCustomerOrders } from "@/lib/orders/data";

export default async function CustomerOrdersPage() {
  const current = await requireRole(["customer"], "/dashboard/orders");
  const orders = await getCustomerOrders(current.user.id);

  return (
    <DashboardPanel
      title="Sifarişlər"
      description="Checkout təsdiqindən sonra yaranan real sifarişlər"
    >
      <OrderList orders={orders} />
    </DashboardPanel>
  );
}
