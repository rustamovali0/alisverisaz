import { StorefrontAccessManager } from "@/components/admin/stores/storefront-access-manager";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getAdminStorefrontAccessRows } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

export default async function AdminSubdomainsPage() {
  await requireRole(["admin"], "/radmin/subdomains");
  const stores = await getAdminStorefrontAccessRows();
  const activeCount = stores.filter((store) => store.customStorefrontEnabled).length;

  return (
    <div className="space-y-6">
      <DashboardPanel
        title="Subdomainlər"
        description="Mağazalar üçün /magaza-adi və magaza-adi.alisveris.az girişini aktiv və ya deaktiv edin."
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Mağaza sayı
            </p>
            <p className="mt-2 text-2xl font-black">{stores.length}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Aktiv storefront
            </p>
            <p className="mt-2 text-2xl font-black">{activeCount}</p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Passiv storefront
            </p>
            <p className="mt-2 text-2xl font-black">{stores.length - activeCount}</p>
          </div>
        </div>
        <StorefrontAccessManager stores={stores} />
      </DashboardPanel>
    </div>
  );
}
