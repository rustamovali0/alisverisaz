import { ResourcePage } from "@/components/dashboard/resource-page";
import { requireRole } from "@/lib/auth/session";
import { getAdminResource } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  await requireRole(["admin"], "/radmin/stores");
  const resource = await getAdminResource("stores");

  return (
    <ResourcePage
      title="Mağazalar"
      description="stores cədvəlindən oxunan real mağazalar"
      totalLabel="Mağaza sayı"
      total={resource.total}
      items={resource.items}
    />
  );
}
