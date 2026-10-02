import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AdminPromotionManager } from "@/components/promotions/admin-promotion-manager";
import { requireRole } from "@/lib/auth/session";
import { getAdminPromotionRequests } from "@/lib/promotions/data";
import { getManagedProducts } from "@/lib/products/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  await requireRole(["admin"], "/radmin/promotions");
  const supabase = createSupabaseAdminClient();
  const [{ data: stores }, products, requests] = await Promise.all([
    (supabase as any)
      .from("stores")
      .select("id,name,slug,status")
      .eq("status", "active")
      .order("name", { ascending: true }),
    getManagedProducts({ listingType: "store" }),
    getAdminPromotionRequests(),
  ]);

  return (
    <DashboardPanel
      title="Önə çıxarma sorğuları"
      description="Mağaza və məhsulları ömürlük önə çıxarın, satıcı sorğularını təsdiqləyin və ya ləğv edin."
    >
      <AdminPromotionManager stores={stores ?? []} products={products} requests={requests} />
    </DashboardPanel>
  );
}
