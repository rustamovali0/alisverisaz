import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getCustomerResource } from "@/lib/dashboard/data";

export default async function FavoritesPage() {
  const current = await requireRole(["customer"], "/dashboard/favorites");
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
