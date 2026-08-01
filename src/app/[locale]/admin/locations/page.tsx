import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { StoreLocationManager } from "@/components/locations/store-location-manager";
import { requireRole } from "@/lib/auth/session";
import { getAllStoreLocations } from "@/lib/locations/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPage() {
  await requireRole(["admin"], "/radmin/locations");
  const supabase = createSupabaseAdminClient();
  const [{ data: stores }, locations] = await Promise.all([
    (supabase as any)
      .from("stores")
      .select("id,name")
      .order("created_at", {
        ascending: false,
      }),
    getAllStoreLocations(),
  ]);

  return (
    <DashboardPanel
      title="Satış nöqtələri"
      description="Bütün mağazaların ünvan, metro, avtobus və mövcudluq nöqtələrini idarə edin."
    >
      <StoreLocationManager stores={stores ?? []} locations={locations} />
    </DashboardPanel>
  );
}
