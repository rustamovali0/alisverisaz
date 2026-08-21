import { notFound } from "next/navigation";

import { CustomerOrderDetailView } from "@/components/customer-account/customer-account-views";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";
import { getCustomerOrderDetail } from "@/lib/orders/data";

type CustomerOrderDetailPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CustomerOrderDetailPage({
  params,
}: CustomerOrderDetailPageProps) {
  const [{ orderId }, current, enabled] = await Promise.all([
    params,
    requireRole(["customer"], "/dashboard/orders"),
    getCustomerFeatureAccess("orders"),
  ]);

  if (!enabled) {
    notFound();
  }

  const order = await getCustomerOrderDetail(current.user.id, orderId);

  if (!order) {
    notFound();
  }

  return <CustomerOrderDetailView order={order} />;
}
