"use client";

import { Check, Crown, X } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  approvePromotionRequestAction,
  rejectPromotionRequestAction,
} from "@/lib/promotions/actions";
import type { PromotionActionResult, PromotionRequest } from "@/lib/promotions/types";

type AdminPromotionManagerProps = {
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

export function AdminPromotionManager({ requests }: AdminPromotionManagerProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border bg-background p-8 text-sm text-muted-foreground">
        Hələ önə çıxarma sorğusu yoxdur.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
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
                {request.requestedDays} gün · {formatMoney(request.dailyPriceAmount, request.currency)} / gün · Cəmi {formatMoney(request.totalAmount, request.currency)}
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
          </div>
        </article>
      ))}
    </div>
  );
}
