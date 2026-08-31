"use client";

import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  deleteSellerPromoCodeAction,
  saveSellerPromoCodeAction,
  toggleSellerPromoCodeAction,
} from "@/lib/promos/actions";
import type { SellerPromoCode } from "@/lib/promos/types";

type PromoStoreOption = {
  id: string;
  name: string;
};

type PromoCodesManagerProps = {
  mode: "seller" | "admin";
  stores: PromoStoreOption[];
  promos: SellerPromoCode[];
};

type EditingPromo = SellerPromoCode | null;

function toDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Müddətsiz";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PromoCodesManager({
  mode,
  stores,
  promos,
}: PromoCodesManagerProps) {
  const [editingPromo, setEditingPromo] = useState<EditingPromo>(null);
  const [isPending, startTransition] = useTransition();
  const defaultStoreId = stores[0]?.id ?? "";
  const nowValue = useMemo(() => toDateTimeInput(new Date().toISOString()), []);

  function submit(formData: FormData) {
    formData.set("mode", mode);

    startTransition(async () => {
      const result = await saveSellerPromoCodeAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Promo saxlanmadı");
        return;
      }

      setEditingPromo(null);
      void appAlert.success("Promo saxlandı", result.message);
    });
  }

  function togglePromo(promo: SellerPromoCode) {
    startTransition(async () => {
      const formData = new FormData();

      formData.set("mode", mode);
      formData.set("promoId", promo.id);
      formData.set("isActive", promo.isActive ? "false" : "true");

      const result = await toggleSellerPromoCodeAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Promo yenilənmədi");
        return;
      }

      void appAlert.success("Promo yeniləndi", result.message);
    });
  }

  async function deletePromo(promo: SellerPromoCode) {
    const confirmed = await appAlert.confirm({
      title: "Promo kod silinsin?",
      message: `${promo.code} promo kodunu silmək istədiyinizə əminsiniz? Order tarixçəsi dəyişməyəcək.`,
      confirmText: "Sil",
      cancelText: "Ləğv et",
      variant: "danger",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();

      formData.set("mode", mode);
      formData.set("promoId", promo.id);

      const result = await deleteSellerPromoCodeAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Promo silinmədi");
        return;
      }

      void appAlert.success("Promo silindi", result.message);
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form action={submit} className="grid h-fit gap-4 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-lg font-black tracking-normal">
            {editingPromo ? "Promo kodu redaktə et" : "Yeni promo kod"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Promo yalnız seçilən satıcının məhsullarında işləyəcək.
          </p>
        </div>
        <input type="hidden" name="promoId" value={editingPromo?.id ?? ""} />
        <label className="grid gap-2 text-sm font-medium">
          Mağaza
          <select
            name="storeId"
            defaultValue={editingPromo?.storeId ?? defaultStoreId}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Promo kod
          <input
            name="code"
            defaultValue={editingPromo?.code ?? ""}
            placeholder="BUTUN25"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Endirim faizi
          <input
            name="discountPercent"
            type="number"
            min={1}
            max={100}
            step={0.01}
            defaultValue={editingPromo?.discountPercent ?? 25}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Başlama tarixi
          <input
            name="startsAt"
            type="datetime-local"
            defaultValue={toDateTimeInput(editingPromo?.startsAt) || nowValue}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Bitmə tarixi
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={toDateTimeInput(editingPromo?.endsAt)}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm font-medium">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={editingPromo?.isActive ?? true}
            className="size-4"
          />
          Aktiv
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending || stores.length === 0}>
            {isPending ? "Saxlanılır" : editingPromo ? "Yenilə" : "Yarat"}
          </Button>
          {editingPromo ? (
            <Button type="button" variant="outline" onClick={() => setEditingPromo(null)}>
              Ləğv et
            </Button>
          ) : null}
        </div>
      </form>

      <section className="min-w-0 rounded-lg border bg-card p-4">
        <div className="mb-4">
          <h2 className="text-lg font-black tracking-normal">Promo kodlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aktiv/deaktiv, edit və silmə əməliyyatları buradan idarə olunur.
          </p>
        </div>
        {promos.length === 0 ? (
          <div className="grid min-h-44 place-items-center rounded-lg border bg-background text-center text-sm text-muted-foreground">
            Promo kod yoxdur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-normal text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-3">Kod</th>
                  <th className="py-3 pr-3">Endirim</th>
                  <th className="py-3 pr-3">Başlayır</th>
                  <th className="py-3 pr-3">Bitir</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3 pr-3">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr key={promo.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3 font-black">{promo.code}</td>
                    <td className="py-3 pr-3">{promo.discountPercent}%</td>
                    <td className="py-3 pr-3">{formatDate(promo.startsAt)}</td>
                    <td className="py-3 pr-3">{formatDate(promo.endsAt)}</td>
                    <td className="py-3 pr-3">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">
                        {promo.isActive ? "Aktiv" : "Deaktiv"}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPromo(promo)}
                        >
                          <Pencil className="mr-2 size-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => togglePromo(promo)}
                          disabled={isPending}
                        >
                          {promo.isActive ? (
                            <PowerOff className="mr-2 size-4" aria-hidden="true" />
                          ) : (
                            <Power className="mr-2 size-4" aria-hidden="true" />
                          )}
                          {promo.isActive ? "Deaktiv et" : "Aktiv et"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void deletePromo(promo)}
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 size-4" aria-hidden="true" />
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
