import { CustomerNotificationsView } from "@/components/customer-account/customer-account-views";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";
import { getCustomerNotifications } from "@/lib/customer-account/data";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";

export const dynamic = "force-dynamic";

export default async function CustomerNotificationsPage() {
  const current = await requireRole(["customer"], "/dashboard/notifications");
  const enabled = await getCustomerFeatureAccess("notifications");

  if (!enabled) {
    return <FeatureBlocked title="Bildirişlər" />;
  }

  const notifications = await getCustomerNotifications(current.user.id);

  return <CustomerNotificationsView notifications={notifications} />;
}
