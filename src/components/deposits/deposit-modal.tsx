"use client";

import { HandCoins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { createDepositAction } from "@/lib/deposits/actions";
import type { CartProduct } from "@/lib/cart/types";
import { showToast } from "@/lib/toast";

type DepositModalProps = {
  product: CartProduct;
  enabled: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

export function DepositModal({ product, enabled }: DepositModalProps) {
  const t = useTranslations("marketplace");
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("5");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canUseDeposit = enabled && product.depositEnabled && product.depositAmount > 0;

  function addAmount(value: number) {
    const current = Number(amount.replace(",", ".")) || 0;
    setAmount(String(Math.round((current + value) * 100) / 100));
  }

  function closeModal() {
    setSuccessMessage(null);
    setIsOpen(false);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createDepositAction(formData);

      if (!result.ok) {
        showToast({
          title: "Beh yaradılmadı",
          description: result.message,
        });
        return;
      }

      setSuccessMessage(result.message);
    });
  }

  if (!canUseDeposit) {
    return null;
  }

  const modal = isOpen
    ? createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label="Modalı bağla"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md rounded-xl border bg-card p-5 text-card-foreground shadow-2xl">
            {successMessage ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <HandCoins className="size-7" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-normal">
                  Beh sifarişi yaradıldı
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{successMessage}</p>
                <Button
                  type="button"
                  className="mt-5 w-full"
                  onClick={closeModal}
                >
                  Bağla
                </Button>
              </div>
            ) : (
              <form action={handleSubmit}>
                <input type="hidden" name="productId" value={product.id} />
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-normal">Beh göndər</h2>
                  <p className="text-sm text-muted-foreground">{product.name}</p>
                </div>
                <div className="mt-4 grid gap-4">
                  <label className="grid gap-2 text-sm font-medium">
                    Ad Soyad
                    <input
                      name="fullName"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Telefon
                    <PhoneInput name="phone" required />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Beh məbləği
                    <input
                      name="amount"
                      value={amount}
                      inputMode="decimal"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onChange={(event) => setAmount(event.target.value)}
                      required
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[10, 15, 20].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addAmount(value)}
                      >
                        +{value} AZN
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tövsiyə olunan beh: {formatMoney(product.depositAmount)}.
                  </p>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button type="submit" className="flex-1" disabled={isPending}>
                    {isPending ? "Yaradılır" : "Təsdiqlə"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    disabled={isPending}
                  >
                    Bağla
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
        <HandCoins className="mr-2 size-4" aria-hidden="true" />
        {t("sendDeposit")}
      </Button>
      {modal}
    </>
  );
}
