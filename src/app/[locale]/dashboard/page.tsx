import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { OrderList } from "@/components/orders/order-list";
import { requireRole } from "@/lib/auth/session";
import { getCustomerOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const current = await requireRole(["customer"], "/dashboard");
  const orders = await getCustomerOrders(current.user.id);

  return (
    <DashboardPanel
      title="Sifariş statusu"
      description="Sifarişləriniz və cari statusları burada görünür."
    >
      <OrderList orders={orders} />
    </DashboardPanel>
  );
}
