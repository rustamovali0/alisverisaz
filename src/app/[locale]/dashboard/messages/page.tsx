import { MessageCircle } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function CustomerMessagesPage() {
  await requireRole(["customer"], "/dashboard/messages");
  const enabled = await getCustomerFeatureAccess("messages");

  if (!enabled) {
    return <FeatureBlocked title="Mesajlar" />;
  }

  return (
    <DashboardPanel
      title="Mesajlar"
      description="Mağazalarla məhsul və sifariş danışıqları burada görünəcək."
    >
      <EmptyState
        className="min-h-72 rounded-md border bg-background p-8"
        icon={<MessageCircle className="size-6" aria-hidden="true" />}
        title="Hələ mesaj yoxdur"
        description="Məhsul səhifəsindən mağazaya yazdığınız danışıqlar bu bölmədə toplanacaq."
      />
    </DashboardPanel>
  );
}
