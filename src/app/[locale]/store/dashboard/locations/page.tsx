import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { StoreLocationManager } from "@/components/locations/store-location-manager";
import { requireRole } from "@/lib/auth/session";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getLocationsForStores } from "@/lib/locations/data";

export const dynamic = "force-dynamic";

export default async function StoreLocationsPage() {
  const current = await requireRole(["seller"], "/store/dashboard/locations");
  const stores = await getOwnedStores(current.user.id);
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
