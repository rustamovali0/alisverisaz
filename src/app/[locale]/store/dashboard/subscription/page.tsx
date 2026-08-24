import { notFound } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import {
  getActiveStoreSubscription,
  getStoreEntitlements,
} from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";

function formatLimit(value: number | null) {
  return value === null ? "Limitsiz" : String(value);
}

export default async function StoreSubscriptionPage() {
  const current = await requireRole(["seller"], "/store/dashboard");
  const settings = await getSiteSettings();

  if (
    settings.subscriptionsDisabledForSellers ||
    !settings.showSubscriptionInSellerPanel
  ) {
    notFound();
  }

  const stores = await getOwnedStores(current.user.id);
  const rows = await Promise.all(
    stores.map(async (store) => {
      const [subscription, entitlements] = await Promise.all([
        getActiveStoreSubscription(store.id),
        getStoreEntitlements(store.id),
      ]);

      return {
        store,
        subscription,
        entitlements,
      };
    }),
  );

  return (
    <DashboardPanel
      title="Abunəlik"
      description="Plan radmin tərəfindən manual təyin olunur."
    >
      {rows.length === 0 ? (
        <EmptyState
          className="min-h-56"
          title="Mağaza yoxdur"
          description="Abunəlik məlumatı mağaza yaradıldıqdan sonra görünəcək."
        />
      ) : (
        <div className="grid gap-4">
          {rows.map(({ store, subscription, entitlements }) => {
            const productLimit = formatLimit(entitlements.productLimit);
            const imageLimit = formatLimit(entitlements.imagesPerProductLimit);
            const productUsage =
              entitlements.productLimit === null
                ? `${entitlements.productCount} / Limitsiz`
                : `${entitlements.productCount} / ${entitlements.productLimit}`;

            return (
              <article
                key={store.id}
                className="rounded-md border bg-card p-5 text-card-foreground shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {store.name}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-normal">
                      {subscription?.planName ?? "Plan təyin edilməyib"}
                    </h2>
                  </div>
                  <span className="w-fit rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                    {subscription?.status ?? "inactive"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Məhsullar
                    </p>
                    <p className="mt-2 text-sm font-semibold">{productUsage}</p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Məhsul limiti
                    </p>
                    <p className="mt-2 text-sm font-semibold">{productLimit}</p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Bir məhsula şəkil
                    </p>
                    <p className="mt-2 text-sm font-semibold">{imageLimit}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}
