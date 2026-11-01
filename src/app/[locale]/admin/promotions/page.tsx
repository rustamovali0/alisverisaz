import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AdminSellerEmailPermissions } from "@/components/promotions/admin-seller-email-permissions";
import {loadAdminSellerEmailPermissions} from "@/lib/email/seller";
import {getActivePromotionMaps} from "@/lib/promotions/data";
import { AdminPromotionManager } from "@/components/promotions/admin-promotion-manager";
import { requireRole } from "@/lib/auth/session";
import { getAdminPromotionRequests } from "@/lib/promotions/data";
import { getManagedProducts } from "@/lib/products/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  await requireRole(["admin"], "/radmin/promotions");
  const supabase = createSupabaseAdminClient();
  const [{ data: stores }, products, requests,emailAccess,active] = await Promise.all([
    (supabase as any)
      .from("stores")
      .select("id,name,slug,status")
      .eq("status", "active")
      .order("name", { ascending: true }),
    getManagedProducts({ listingType: "store" }),
    getAdminPromotionRequests(),loadAdminSellerEmailPermissions(),getActivePromotionMaps(),
  ]);

  return (
    <DashboardPanel
      title="Önə çıxarma sorğuları"
      description="Mağaza və məhsulları ömürlük önə çıxarın, satıcı sorğularını təsdiqləyin və ya ləğv edin."
    >
      <AdminPromotionManager stores={stores ?? []} products={products} requests={requests} />
      <AdminSellerEmailPermissions available={emailAccess.available} stores={(stores||[]).map((store:any)=>({...store,promoted:active.promotedStoreIds.has(store.id),enabled:emailAccess.permissions.some((p:any)=>p.store_id===store.id&&p.enabled)}))}/>
    </DashboardPanel>
  );
}
