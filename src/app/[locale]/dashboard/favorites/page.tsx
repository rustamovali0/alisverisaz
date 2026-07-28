import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";
import { getCustomerResource } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const current = await requireRole(["customer"], "/dashboard/favorites");
  const enabled = await getCustomerFeatureAccess("favorites");

  if (!enabled) {
    return <FeatureBlocked title="Favorilər" />;
  }

  const resource = await getCustomerResource(current.user.id, "favorites");

  return (
    <ResourcePage
      title="Favorilər"
      description="Seçilmiş məhsullarınız"
      totalLabel="Favori sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
