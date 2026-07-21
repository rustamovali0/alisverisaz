import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { ProductMessageList } from "@/components/messages/product-message-list";
import { requireRole } from "@/lib/auth/session";
import { getAdminProductMessages } from "@/lib/messages/data";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  await requireRole(["admin"], "/radmin/messages");
  const messages = await getAdminProductMessages();

  return (
    <DashboardPanel
      title="Məhsul mesajları"
      description="Bütün satıcıların məhsullarına yazılan chat mesajları."
    >
      <ProductMessageList messages={messages} />
    </DashboardPanel>
  );
}
