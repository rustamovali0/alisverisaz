import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { CustomerOrdersView } from "@/components/customer-account/customer-account-views";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";
import { getCustomerOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const current = await requireRole(["customer", "seller"], "/dashboard/orders");
  const enabled = await getCustomerFeatureAccess("orders");

  if (!enabled) {
    return <FeatureBlocked title="Sifarişlər" />;
  }

  const orders = await getCustomerOrders(current.user.id);

  return (
    <DashboardPanel
      title="Sifarişlər"
      description="Checkout təsdiqindən sonra yaranan real sifarişlər"
    >
      <CustomerOrdersView orders={orders} />
    </DashboardPanel>
  );
}
