import { WhatsAppOrderTemplateManager } from "@/components/admin/whatsapp/whatsapp-order-template-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getWhatsAppOrderTemplateForAdmin } from "@/lib/whatsapp-orders/data";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppOrdersPage() {
  await requireRole(["admin"], "/radmin/whatsapp-orders");
  const template = await getWhatsAppOrderTemplateForAdmin();

  return (
    <DashboardPanel
      title="WhatsApp sifarişləri"
      description="Checkout-da WhatsApp üzərindən tamamlanan sifariş mesajını idarə edin."
    >
      <WhatsAppOrderTemplateManager template={template} />
    </DashboardPanel>
  );
}
