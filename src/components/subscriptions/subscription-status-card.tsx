import type { StoreSubscription } from "@/lib/subscriptions/types";

type SubscriptionStatusCardProps = {
  subscription: StoreSubscription | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Limitsiz";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function SubscriptionStatusCard({
  subscription,
}: SubscriptionStatusCardProps) {
  if (!subscription) {
    return (
      <section className="rounded-md border bg-card p-5 text-card-foreground shadow-sm">
        <h2 className="text-base font-semibold tracking-normal">
          Aktiv plan yoxdur
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Yeni elan yaratmaq üçün mağaza planı aktiv edilməlidir.
        </p>
      </section>
    );
  }

  const usagePercent =
    subscription.listingLimit > 0
      ? Math.min(
          Math.round(
            (subscription.listingCount / subscription.listingLimit) * 100,
          ),
          100,
        )
      : 0;

  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-normal">
            {subscription.planName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Bitmə tarixi: {formatDate(subscription.endsAt)}
          </p>
        </div>
        <span className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
          {subscription.status}
        </span>
      </div>
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Elan limiti</span>
          <span className="font-medium">
            {subscription.listingCount} / {subscription.listingLimit}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Qalan elan sayı: {subscription.remainingListings}
        </p>
      </div>
    </section>
  );
}
