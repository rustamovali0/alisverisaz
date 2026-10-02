"use client";

import { BadgePlus, Crown, Package, Store } from "lucide-react";
import { useMemo, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { createPromotionRequestAction } from "@/lib/promotions/actions";
import {
  promotionDailyPrices,
  type PromotionRequest,
  type PromotionTargetType,
} from "@/lib/promotions/types";
import type { ManagedProduct } from "@/lib/products/types";

type StoreOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

type SellerPromotionManagerProps = {
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
    return "-";
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
  return "Gözləyir";
}

export function SellerPromotionManager({
  stores,
  products,
  requests,
}: SellerPromotionManagerProps) {
  const [targetType, setTargetType] = useState<PromotionTargetType>("store");
  const [days, setDays] = useState(3);
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const visibleProducts = useMemo(
    () => products.filter((product) => product.storeId === selectedStoreId),
    [products, selectedStoreId],
  );
  const dailyPrice = promotionDailyPrices[targetType];
  const totalPrice = dailyPrice * days;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createPromotionRequestAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Sorğu göndərilmədi");
        return;
      }

      void appAlert.success("Sorğu göndərildi", result.message);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl border bg-background p-4"
      >
        <div className="grid gap-2">
          <p className="text-sm font-black">Nəyi önə çıxarmaq istəyirsiniz?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "store" as const, label: "Mağaza", icon: Store },
              { value: "product" as const, label: "Məhsul", icon: Package },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <label
                  key={item.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-bold has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800"
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

        <label className="grid gap-2 text-sm font-bold">
          Mağaza
          <select
            name="storeId"
            value={selectedStoreId}
            onChange={(event) => setSelectedStoreId(event.target.value)}
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
          <label className="grid gap-2 text-sm font-bold">
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
        ) : null}

        <label className="grid gap-2 text-sm font-bold">
          Müddət
          <select
            name="requestedDays"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[1, 3, 5, 7, 14, 30].map((value) => (
              <option key={value} value={value}>
                {value} gün
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold">
          Qeyd
          <textarea
            name="sellerNote"
            placeholder="Məsələn: ödənişi kartla edəcəyəm, zəng edin..."
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <div className="rounded-lg border bg-card p-3 text-sm">
          <p className="font-black">
            {formatMoney(dailyPrice)} / gün
          </p>
          <p className="mt-1 text-muted-foreground">
            Ümumi məbləğ: <strong>{formatMoney(totalPrice)}</strong>
          </p>
        </div>

        <Button type="submit" disabled={isPending || stores.length === 0}>
          <BadgePlus className="mr-2 size-4" aria-hidden="true" />
          {isPending ? "Göndərilir" : "Önə çıxarma sorğusu göndər"}
        </Button>
      </form>

      <div className="grid content-start gap-3">
        {requests.length === 0 ? (
          <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
            Hələ önə çıxarma sorğunuz yoxdur.
          </div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="rounded-xl border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                    <Crown className="size-3.5" aria-hidden="true" />
                    {statusLabel(request.status)}
                  </div>
                  <h3 className="break-words text-sm font-black">
                    {request.targetType === "store"
                      ? request.storeName
                      : request.productName ?? "Məhsul"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.requestedDays} gün · {formatMoney(request.totalAmount, request.currency)}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                  {request.targetType === "store" ? "Mağaza" : "Məhsul"}
                </span>
              </div>
              <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                <span>Başlama: {formatDate(request.startsAt)}</span>
                <span>Bitmə: {formatDate(request.endsAt)}</span>
                {request.adminNote ? <span>Admin qeydi: {request.adminNote}</span> : null}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
