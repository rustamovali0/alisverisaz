import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { SubscriptionStatusCard } from "@/components/subscriptions/subscription-status-card";
import { requireRole } from "@/lib/auth/session";
import { getSellerSubscriptionOverview } from "@/lib/subscriptions/data";

export default async function StoreSubscriptionPage() {
  const current = await requireRole(["seller"], "/store/dashboard/subscription");
  const overview = await getSellerSubscriptionOverview(current.user.id);
  const selectedStore = overview.storeSubscriptions[0];

  return (
    <div className="space-y-6">
      {selectedStore ? (
        <SubscriptionStatusCard subscription={selectedStore.subscription} />
      ) : (
        <EmptyState
          className="rounded-md border bg-card p-8 shadow-sm"
          title="Mağaza yoxdur"
          description="Plan aktiv etmək üçün əvvəl mağaza yaradılmalıdır."
        />
      )}

      <DashboardPanel
        title="Planlar"
        description="Real ödəniş qoşulmayıb; aktivləşdirmə placeholder olaraq 1 aylıq subscription yaradır."
      >
        {overview.plans.length === 0 ? (
          <EmptyState
            className="min-h-56"
            title="Plan yoxdur"
            description="Admin panelindən aktiv plan yaradıldıqda burada görünəcək."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {overview.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                storeId={selectedStore?.store.id}
                activeSubscription={selectedStore?.subscription}
              />
            ))}
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}
