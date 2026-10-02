"use client";

import { BadgePlus, Check, Crown, Package, Store, X } from "lucide-react";
import { useMemo, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  approvePromotionRequestAction,
  cancelPromotionRequestAction,
  createAdminPromotionAction,
  rejectPromotionRequestAction,
} from "@/lib/promotions/actions";
import type {
  PromotionActionResult,
  PromotionRequest,
  PromotionTargetType,
} from "@/lib/promotions/types";
import type { ManagedProduct } from "@/lib/products/types";

type StoreOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

type AdminPromotionManagerProps = {
  stores: StoreOption[];
  products: ManagedProduct[];
  requests: PromotionRequest[];
};

function formatMoney(value: number, currency = "AZN") {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Ömürlük";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: PromotionRequest["status"]) {
  if (status === "approved") return "Aktiv";
  if (status === "rejected") return "Rədd edildi";
  if (status === "canceled") return "Ləğv edildi";
  return "Ödəniş gözləyir";
}

function AdminPromotionActionButton({
  requestId,
  action,
  label,
  successTitle,
  variant = "default",
}: {
  requestId: string;
  action: (formData: FormData) => Promise<PromotionActionResult>;
  label: string;
  successTitle: string;
  variant?: "default" | "destructive";
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("requestId", requestId);
      const result = await action(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Əməliyyat alınmadı");
        return;
      }

      void appAlert.success(successTitle, result.message);
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={isPending}
      onClick={handleClick}
    >
      {variant === "destructive" ? (
        <X className="mr-2 size-4" aria-hidden="true" />
      ) : (
        <Check className="mr-2 size-4" aria-hidden="true" />
      )}
      {isPending ? "İcra olunur" : label}
    </Button>
  );
}

function AdminDirectPromotionForm({
  stores,
  products,
}: {
  stores: StoreOption[];
  products: ManagedProduct[];
}) {
  const [targetType, setTargetType] = useState<PromotionTargetType>("store");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const visibleProducts = useMemo(
    () => products.filter((product) => product.storeId === storeId),
    [products, storeId],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createAdminPromotionAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Aktiv edilmədi");
        return;
      }

      void appAlert.success("Önə çıxarıldı", result.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border bg-background p-4">
      <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <div className="grid gap-2">
          <span className="text-sm font-black">Tip</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "store" as const, label: "Mağaza", icon: Store },
              { value: "product" as const, label: "Məhsul", icon: Package },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <label
                  key={item.value}
                  className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800"
                >
                  <input
                    type="radio"
                    name="targetType"
                    value={item.value}
                    checked={targetType === item.value}
                    onChange={() => setTargetType(item.value)}
                    className="sr-only"
                  />
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </label>
              );
            })}
          </div>
        </div>

        <label className="grid gap-2 text-sm font-black">
          Mağaza
          <select
            name="storeId"
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
            required
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>

        {targetType === "product" ? (
          <label className="grid gap-2 text-sm font-black">
            Məhsul
            <select
              name="productId"
              required
              className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Məhsul seçin</option>
              {visibleProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="productId" value="" />
        )}

        <Button type="submit" disabled={isPending || stores.length === 0}>
          <BadgePlus className="mr-2 size-4" aria-hidden="true" />
          {isPending ? "Aktiv edilir" : "Ömürlük önə çıxar"}
        </Button>
      </div>
    </form>
  );
}

export function AdminPromotionManager({
  stores,
  products,
  requests,
}: AdminPromotionManagerProps) {
  return (
    <div className="grid gap-4">
      <AdminDirectPromotionForm stores={stores} products={products} />

      {requests.length === 0 ? (
        <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground">
          Hələ önə çıxarma sorğusu yoxdur.
        </div>
      ) : null}

      {requests.map((request) => (
        <article key={request.id} className="rounded-xl border bg-background p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                  <Crown className="size-3.5" aria-hidden="true" />
                  {statusLabel(request.status)}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                  {request.targetType === "store" ? "Mağaza" : "Məhsul"}
                </span>
              </div>
              <h3 className="break-words text-base font-black">
                {request.targetType === "store"
                  ? request.storeName
                  : request.productName ?? "Məhsul"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Mağaza: {request.storeName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Satıcı: {request.requesterName ?? request.requesterEmail ?? request.requesterId}
              </p>
              <p className="mt-2 text-sm font-black">
                {request.status === "approved" && !request.endsAt
                  ? "Ömürlük önə çıxarılıb"
                  : `${request.requestedDays} gün · ${formatMoney(request.dailyPriceAmount, request.currency)} / gün · Cəmi ${formatMoney(request.totalAmount, request.currency)}`}
              </p>
              <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                <span>Yaradıldı: {formatDate(request.createdAt)}</span>
                <span>Başlama: {formatDate(request.startsAt)}</span>
                <span>Bitmə: {formatDate(request.endsAt)}</span>
                {request.sellerNote ? <span>Satıcı qeydi: {request.sellerNote}</span> : null}
                {request.adminNote ? <span>Admin qeydi: {request.adminNote}</span> : null}
              </div>
            </div>

            {request.status === "pending" ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <AdminPromotionActionButton
                  requestId={request.id}
                  action={approvePromotionRequestAction}
                  label="Təsdiqlə"
                  successTitle="Aktiv edildi"
                />
                <AdminPromotionActionButton
                  requestId={request.id}
                  action={rejectPromotionRequestAction}
                  label="Rədd et"
                  successTitle="Rədd edildi"
                  variant="destructive"
                />
              </div>
            ) : null}
            {request.status === "approved" ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <AdminPromotionActionButton
                  requestId={request.id}
                  action={cancelPromotionRequestAction}
                  label="Ləğv et"
                  successTitle="Ləğv edildi"
                  variant="destructive"
                />
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
