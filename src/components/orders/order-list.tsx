"use client";

import { useTransition } from "react";
import { Archive, PackageSearch, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  deleteAllOrdersAction,
  deleteOrderAction,
  updateOrderStatusAction,
} from "@/lib/orders/actions";
import {
  orderStatusLabels,
  orderStatusOptions,
  type ManagedOrder,
  type OrderStatus,
} from "@/lib/orders/types";

type OrderViewerRole = "admin" | "seller" | "customer";

type OrderListProps = {
  orders: ManagedOrder[];
  canUpdateStatus?: boolean;
  canDelete?: boolean;
  viewerRole?: OrderViewerRole;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency,
  }).format(value);
}

type StatusOption = {
  value: OrderStatus;
  label: string;
  disabled?: boolean;
};

function OrderStatusForm({
  order,
  statusOptions,
}: {
  order: ManagedOrder;
  statusOptions: StatusOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const options = statusOptions.some((status) => status.value === order.status)
    ? statusOptions
    : [
        {
          value: order.status,
          label: orderStatusLabels[order.status],
          disabled: true,
        },
        ...statusOptions,
      ];

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateOrderStatusAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Status yenilənmədi");
        return;
      }

      void appAlert.success("Status yeniləndi", result.message);
      router.refresh();
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
        {options.map((status) => (
          <option key={status.value} value={status.value} disabled={status.disabled}>
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

export function OrderList({
  orders,
  canUpdateStatus = false,
  canDelete = false,
  viewerRole = "customer",
}: OrderListProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isSeller = viewerRole === "seller";
  const statusOptions =
    viewerRole === "seller"
      ? orderStatusOptions.filter((status) =>
          (["canceled", "archived"] as OrderStatus[]).includes(status.value),
        )
      : orderStatusOptions;
  const DeleteIcon = isSeller ? Archive : Trash2;

  function deleteOrder(orderId: string) {
    startTransition(async () => {
      const confirmed = await appAlert.confirm({
        title: isSeller ? "Sifariş arxivlənsin?" : "Sifariş silinsin?",
        message: isSeller
          ? "Bu sifariş hard delete edilmədən arxiv statusuna keçiriləcək."
          : "Bu sifariş paneldən silinəcək.",
        confirmText: isSeller ? "Arxivlə" : "Sil",
        cancelText: "Bağla",
        variant: isSeller ? "default" : "danger",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      const formData = new FormData();
      formData.set("orderId", orderId);
      const result = await deleteOrderAction(formData);

      if (!result.ok) {
        void appAlert.error(
          result.message,
          isSeller ? "Sifariş arxivlənmədi" : "Sifariş silinmədi",
        );
        return;
      }

      void appAlert.success(isSeller ? "Sifariş arxivləndi" : "Sifariş silindi", result.message);
      router.refresh();
    });
  }

  function deleteAllOrders() {
    startTransition(async () => {
      const confirmed = await appAlert.confirm({
        title: isSeller ? "Bütün sifarişlər arxivlənsin?" : "Bütün sifarişlər silinsin?",
        message: isSeller
          ? "Sizə bağlı bütün sifarişlər hard delete edilmədən arxiv statusuna keçiriləcək."
          : "Sizə bağlı bütün sifariş qeydləri silinəcək.",
        confirmText: isSeller ? "Hamısını arxivlə" : "Hamısını sil",
        cancelText: "Bağla",
        variant: isSeller ? "default" : "danger",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      const result = await deleteAllOrdersAction();

      if (!result.ok) {
        void appAlert.error(
          result.message,
          isSeller ? "Sifarişlər arxivlənmədi" : "Sifarişlər silinmədi",
        );
        return;
      }

      void appAlert.success(
        isSeller ? "Sifarişlər arxivləndi" : "Sifarişlər silindi",
        result.message,
      );
      router.refresh();
    });
  }

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
      {canDelete ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={deleteAllOrders}
          >
            <DeleteIcon className="mr-2 size-4" aria-hidden="true" />
            {isSeller ? "Hamısını arxivlə" : "Hamısını sil"}
          </Button>
        </div>
      ) : null}
      {orders.map((order) => (
        <article
          key={order.id}
          className="rounded-md border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mt-1 text-sm font-medium text-foreground">
                Mağaza: {order.storeName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Alıcı: {order.customerName} · {order.customerPhone}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ünvan: {order.address}
              </p>
              {order.note ? (
                <p className="mt-1 text-sm text-muted-foreground">Qeyd: {order.note}</p>
              ) : null}
            </div>
            <div className="space-y-2 text-sm lg:text-right">
              <p className="font-medium">
                {formatMoney(order.totalAmount, order.currency)}
              </p>
              <p className="text-muted-foreground">
                Status: {orderStatusLabels[order.status]}
              </p>
              {canUpdateStatus ? (
                <OrderStatusForm order={order} statusOptions={statusOptions} />
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={isPending}
                  onClick={() => deleteOrder(order.id)}
                >
                  <DeleteIcon className="mr-2 size-4" aria-hidden="true" />
                  {isSeller ? "Arxivlə" : "Sil"}
                </Button>
              ) : null}
            </div>
          </div>
          <p className="mt-4 text-xs font-bold uppercase text-muted-foreground">
            Məhsullar
          </p>
          <div className="mt-4 divide-y rounded-md border bg-background">
            {order.items.map((item) => (
              <OrderProductItem key={item.id} item={item} currency={order.currency} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function OrderProductItem({
  item,
  currency,
}: {
  item: ManagedOrder["items"][number];
  currency: string;
}) {
  const href =
    item.storeSlug && item.productSlug
      ? `/${item.storeSlug}/products/${item.productSlug}`
      : null;
  const content = (
    <>
      <div className="size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <PackageSearch className="size-7" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.productName}
        </p>
        {item.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          Miqdar: {item.quantity} · Bir məhsul: {formatMoney(item.unitPrice, currency)}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold">
        {formatMoney(item.totalAmount, currency)}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex flex-col gap-3 px-3 py-3 transition hover:bg-muted/60 sm:flex-row sm:items-center"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
      {content}
    </div>
  );
}
