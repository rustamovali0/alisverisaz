import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { StoreLocationManager } from "@/components/locations/store-location-manager";
import { requireRole } from "@/lib/auth/session";
import { getLocationsForStores } from "@/lib/locations/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type StoreOptionRow = {
  id: string;
  name: string | null;
};

export default async function StoreLocationsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/locations");
  const supabase = createSupabaseAdminClient() as any;
  const { data: storesData } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", current.user.id)
    .order("created_at", { ascending: false });
  const stores = ((storesData ?? []) as StoreOptionRow[]).map((store) => ({
    id: store.id,
    name: store.name ?? "Mağaza",
  }));
  const locations = await getLocationsForStores(stores.map((store) => store.id));

  return (
    <DashboardPanel
      title="Satış nöqtələri"
      description="Mağazanızın filial, götürmə və çatdırılma məntəqələrini idarə edin."
    >
      <StoreLocationManager stores={stores} locations={locations} />
    </DashboardPanel>
  );
}
