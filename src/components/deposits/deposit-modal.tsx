"use client";

import { HandCoins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/swal";
import { createDepositAction } from "@/lib/deposits/actions";
import type { CartProduct } from "@/lib/cart/types";

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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canUseDeposit = enabled && product.depositEnabled && product.depositAmount > 0;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createDepositAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Beh yaradılmadı");
        return;
      }

      await appAlert.success("Beh sifarişi yaradıldı", result.message);
      setIsOpen(false);
      router.push(result.paymentUrl);
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
            onClick={() => setIsOpen(false)}
          />
          <form
            action={handleSubmit}
            className="relative w-full max-w-md rounded-lg border bg-card p-5 text-card-foreground shadow-2xl"
          >
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
                  value={formatMoney(product.depositAmount)}
                  className="h-10 rounded-md border border-input bg-muted px-3 text-sm"
                  readOnly
                />
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Yaradılır" : "Təsdiqlə"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Bağla
              </Button>
            </div>
          </form>
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
