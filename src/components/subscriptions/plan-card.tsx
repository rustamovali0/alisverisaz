import { PlanActivationForm } from "@/components/subscriptions/plan-activation-form";
import type { StoreSubscription, SubscriptionPlan } from "@/lib/subscriptions/types";

type PlanCardProps = {
  plan: SubscriptionPlan;
  storeId?: string;
  activeSubscription?: StoreSubscription | null;
};

function formatPrice(plan: SubscriptionPlan) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: plan.currency,
  }).format(plan.priceAmount);
}

export function PlanCard({ plan, storeId, activeSubscription }: PlanCardProps) {
  const isCurrent = activeSubscription?.planId === plan.id;

  return (
    <article className="flex h-full flex-col rounded-md border bg-card p-5 text-card-foreground shadow-sm">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-normal">{plan.name}</h3>
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {plan.listingLimit} elan
          </span>
        </div>
        {plan.description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {plan.description}
          </p>
        ) : null}
      </div>
      <div className="mt-5">
        <span className="text-3xl font-semibold tracking-normal">
          {formatPrice(plan)}
        </span>
        <span className="ml-1 text-sm text-muted-foreground">/ ay</span>
      </div>
      <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
        <li>Elan limiti: {plan.listingLimit}</li>
        <li>Bitmə tarixi abunəlik aktivləşəndə saxlanılır</li>
        <li>Real ödəniş sistemi üçün placeholder</li>
      </ul>
      {storeId ? (
        <div className="mt-5">
          <PlanActivationForm
            plan={plan}
            storeId={storeId}
            isCurrent={isCurrent}
          />
        </div>
      ) : null}
    </article>
  );
}
