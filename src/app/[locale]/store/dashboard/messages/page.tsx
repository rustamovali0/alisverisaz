import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { ProductMessageList } from "@/components/messages/product-message-list";
import { requireRole } from "@/lib/auth/session";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getSellerProductMessages } from "@/lib/messages/data";

export const dynamic = "force-dynamic";

export default async function StoreMessagesPage() {
  const current = await requireRole(["seller"], "/store/dashboard/messages");
  const storeIds = (await getOwnedStores(current.user.id)).map((store) => store.id);
  const messages = await getSellerProductMessages(storeIds);

  return (
    <DashboardPanel
      title="Mesajlar"
      description="Məhsullara yazılan mesajlar və chat qeydləri"
    >
      <ProductMessageList messages={messages} />
    </DashboardPanel>
  );
}
