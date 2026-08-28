"use client";

import { MapPin, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  saveDefaultCustomerAddressAction,
  type CustomerAddressActionResult,
} from "@/lib/customer-account/actions";
import type { CustomerAddress } from "@/lib/customer-account/data";

type CustomerAddressFormProps = {
  defaultAddress: CustomerAddress | null;
  defaultPhone?: string | null;
};

function addressResultTitle(result: CustomerAddressActionResult) {
  return result.ok ? "Ünvan saxlanıldı" : "Ünvan saxlanılmadı";
}

export function CustomerAddressForm({
  defaultAddress,
  defaultPhone,
}: CustomerAddressFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveDefaultCustomerAddressAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, addressResultTitle(result));
        return;
      }

      void appAlert.success(addressResultTitle(result), result.message);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="mb-4 rounded-lg border bg-background p-4">
      <input type="hidden" name="addressId" value={defaultAddress?.id ?? ""} />
      <div className="mb-4 flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <MapPin className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-black">Əsas ünvan</h2>
          <p className="truncate text-sm text-muted-foreground">
            Sifariş zamanı ünvan inputu avtomatik dolacaq.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Başlıq
          <input
            name="label"
            defaultValue={defaultAddress?.label ?? "Əsas ünvan"}
            className="premium-input h-10 px-3"
            maxLength={80}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Telefon
          <input
            name="phone"
            defaultValue={defaultAddress?.phone ?? defaultPhone ?? ""}
            className="premium-input h-10 px-3"
            maxLength={40}
            placeholder="077 331 33 27"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Şəhər
          <input
            name="city"
            defaultValue={defaultAddress?.city ?? ""}
            className="premium-input h-10 px-3"
            maxLength={120}
            placeholder="Bakı"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Rayon / qəsəbə
          <input
            name="region"
            defaultValue={defaultAddress?.region ?? ""}
            className="premium-input h-10 px-3"
            maxLength={120}
            placeholder="Nizami"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
          Ünvan
          <textarea
            name="address"
            defaultValue={defaultAddress?.address ?? ""}
            className="premium-input min-h-20 px-3 py-2"
            maxLength={500}
            placeholder="Küçə, bina, mənzil"
            required
          />
        </label>
      </div>
      <Button type="submit" className="mt-4 w-full md:w-auto" disabled={isPending}>
        <Save className="mr-2 size-4" aria-hidden="true" />
        {isPending ? "Saxlanılır" : "Əsas ünvan kimi saxla"}
      </Button>
    </form>
  );
}
