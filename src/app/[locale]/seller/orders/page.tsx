import { ArrowLeft, ChevronRight } from "lucide-react";

import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { OrderList } from "@/components/orders/order-list";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getSellerOrders } from "@/lib/orders/data";

export const dynamic = "force-dynamic";

export default async function SellerOrdersPage() {
  const current = await requireRole(["seller"], "/seller/orders");
  const enabled = await getSellerFeatureAccess(current.user.id, "orders");
  if (!enabled) return <FeatureBlocked title="Sifarişlər" />;
  const orders = await getSellerOrders(current.user.id);

  return (
    <main className="container mx-auto min-h-[70vh] max-w-6xl px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 md:pb-10">
      <div className="mb-4 flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0 rounded-lg">
          <Link href="/store/dashboard" aria-label="Mağaza panelinə qayıt"><ArrowLeft className="size-5" /></Link>
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Link href="/store/dashboard">Mağaza paneli</Link><ChevronRight className="size-3.5" /><span>Sifarişlər</span>
          </div>
          <h1 className="truncate text-xl font-black">Sifarişlər</h1>
        </div>
      </div>
      <DashboardPanel title="Sifarişlər" description="Müştərilərdən gələn sifarişlər və status idarəsi">
        <OrderList orders={orders} canUpdateStatus canDelete viewerRole="seller" />
      </DashboardPanel>
    </main>
  );
}
