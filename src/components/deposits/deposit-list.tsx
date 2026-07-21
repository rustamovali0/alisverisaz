import { EmptyState } from "@/components/common/empty-state";
import { depositStatusLabels, type ManagedDeposit } from "@/lib/deposits/types";

type DepositListProps = {
  deposits: ManagedDeposit[];
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency,
  }).format(value);
}

export function DepositList({ deposits }: DepositListProps) {
  if (deposits.length === 0) {
    return (
      <EmptyState
        className="rounded-md border bg-card p-8 shadow-sm"
        title="Beh sifarişi yoxdur"
        description="Müştəri beh göndərdikdə burada görünəcək."
      />
    );
  }

  return (
    <div className="space-y-4">
      {deposits.map((deposit) => (
        <article
          key={deposit.id}
          className="rounded-md border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="grid gap-4 lg:grid-cols-5">
            <div>
              <p className="text-sm text-muted-foreground">Müştəri</p>
              <p className="mt-1 text-sm font-medium">{deposit.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefon</p>
              <p className="mt-1 text-sm font-medium">{deposit.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Məhsul</p>
              <p className="mt-1 text-sm font-medium">{deposit.productName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Beh məbləği</p>
              <p className="mt-1 text-sm font-medium">
                {formatMoney(deposit.amount, deposit.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Qalan məbləğ</p>
              <p className="mt-1 text-sm font-medium">
                {formatMoney(deposit.remainingAmount, deposit.currency)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Status: {depositStatusLabels[deposit.status]}</span>
            {deposit.paymentUrl ? <span>{deposit.paymentUrl}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
