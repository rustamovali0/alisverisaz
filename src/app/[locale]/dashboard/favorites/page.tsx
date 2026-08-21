import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { CustomerFavoritesView } from "@/components/customer-account/customer-account-views";
import { requireRole } from "@/lib/auth/session";
import { getCustomerFeatureAccess } from "@/lib/cms/data";
import { getCustomerFavoritePreviews } from "@/lib/customer-account/data";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const current = await requireRole(["customer"], "/dashboard/favorites");
  const enabled = await getCustomerFeatureAccess("favorites");

  if (!enabled) {
    return <FeatureBlocked title="Favorilər" />;
  }

  const favorites = await getCustomerFavoritePreviews(current.user.id);

  return <CustomerFavoritesView favorites={favorites} />;
}
