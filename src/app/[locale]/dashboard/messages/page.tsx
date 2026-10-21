import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ProductMessageThread } from "@/components/products/product-feedback-lists";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";
import { getCustomerProductMessages } from "@/lib/messages/data";

export const dynamic = "force-dynamic";

export default async function CustomerMessagesPage() {
  const current = await requireRole(["customer", "seller"], "/dashboard/messages");
  const enabled = await getCustomerFeatureAccess("messages");

  if (!enabled) {
    return <FeatureBlocked title="Mesajlar" />;
  }

  const messages = await getCustomerProductMessages(current.user.id);

  return (
    <DashboardPanel
      title="Mesajlar"
      description="Mağazalarla məhsul və sifariş danışıqları burada görünəcək."
    >
      <ProductMessageThread messages={messages} />
    </DashboardPanel>
  );
}
