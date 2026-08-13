import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { ProductMessageList } from "@/components/messages/product-message-list";
import { SupportMessageList } from "@/components/support/support-message-list";
import { requireRole } from "@/lib/auth/session";
import { getAdminProductMessages } from "@/lib/messages/data";
import { getAdminSupportMessages } from "@/lib/support/data";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  await requireRole(["admin"], "/radmin/messages");
  const [messages, supportMessages] = await Promise.all([
    getAdminProductMessages(),
    getAdminSupportMessages(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardPanel
        title="Məhsul mesajları"
        description="Bütün satıcıların məhsullarına yazılan chat mesajları."
      >
        <ProductMessageList messages={messages} />
      </DashboardPanel>

      <DashboardPanel
        title="Dəstək mesajları"
        description="Kömək və əlaqə bölməsindən göndərilən müraciətlər."
      >
        <SupportMessageList messages={supportMessages} />
      </DashboardPanel>
    </div>
  );
}
