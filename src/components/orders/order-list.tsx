"use client";

import { useTransition } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { updateOrderStatusAction } from "@/lib/orders/actions";
import {
  orderStatusLabels,
  orderStatusOptions,
  type ManagedOrder,
} from "@/lib/orders/types";

type OrderListProps = {
  orders: ManagedOrder[];
  canUpdateStatus?: boolean;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency,
  }).format(value);
}

function OrderStatusForm({ order }: { order: ManagedOrder }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateOrderStatusAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Status yenilənmədi");
        return;
      }

      await appAlert.success("Status yeniləndi", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="orderId" value={order.id} />
      <select
        name="status"
        defaultValue={order.status}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {orderStatusOptions.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Yenilənir" : "Yadda saxla"}
      </Button>
    </form>
  );
}

export function OrderList({ orders, canUpdateStatus = false }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        className="rounded-md border bg-card p-8 shadow-sm"
        title="Sifariş yoxdur"
        description="Yeni sifariş yarandıqda burada görünəcək."
      />
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <article
          key={order.id}
          className="rounded-md border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-normal">
                {order.orderNumber}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.customerName} · {order.customerPhone}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{order.address}</p>
              {order.note ? (
                <p className="mt-1 text-sm text-muted-foreground">{order.note}</p>
              ) : null}
            </div>
            <div className="space-y-2 text-sm lg:text-right">
              <p className="font-medium">
                {formatMoney(order.totalAmount, order.currency)}
              </p>
              <p className="text-muted-foreground">
                Status: {orderStatusLabels[order.status]}
              </p>
              {canUpdateStatus ? <OrderStatusForm order={order} /> : null}
            </div>
          </div>
          <div className="mt-4 divide-y rounded-md border bg-background">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {item.productName} x {item.quantity}
                </span>
                <span className="shrink-0 font-medium">
                  {formatMoney(item.totalAmount, order.currency)}
                </span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
