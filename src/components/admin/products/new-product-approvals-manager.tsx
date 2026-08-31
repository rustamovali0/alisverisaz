"use client";

import { useState, useTransition } from "react";
import { Check, Eye, Pencil, Trash2, X } from "lucide-react";

import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  approveProductAction,
  deletePendingProductAction,
  rejectProductAction,
  updateProductApprovalSettingsAction,
} from "@/lib/products/approval-actions";
import type { PendingProductApproval } from "@/lib/products/approval-data";
import type { ProductApprovalSettings } from "@/lib/products/approval-settings";
import type { CategoryOption, ManagedProduct } from "@/lib/products/types";

type NewProductApprovalsManagerProps = {
  settings: ProductApprovalSettings;
  products: PendingProductApproval[];
  managedProducts: ManagedProduct[];
  categories: CategoryOption[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NewProductApprovalsManager({
  settings,
  products,
  managedProducts,
  categories,
}: NewProductApprovalsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectProduct, setRejectProduct] = useState<PendingProductApproval | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const visibleProducts = settings.requireApproval ? products : [];
  const managedProductMap = new Map(managedProducts.map((product) => [product.id, product]));

  function saveSettings(formData: FormData) {
    startTransition(async () => {
      const result = await updateProductApprovalSettingsAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Ayar saxlanmadı");
        return;
      }

      void appAlert.success("Ayar saxlandı", result.message);
      router.refresh();
    });
  }

  function approve(productId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("productId", productId);
      const result = await approveProductAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Məhsul təsdiqlənmədi");
        return;
      }

      void appAlert.success("Məhsul təsdiqləndi", result.message);
      router.refresh();
    });
  }

  function reject() {
    if (!rejectProduct) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("productId", rejectProduct.id);
      formData.set("note", note);
      const result = await rejectProductAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Məhsul rədd edilmədi");
        return;
      }

      setRejectProduct(null);
      setNote("");
      void appAlert.success("Məhsul rədd edildi", result.message);
      router.refresh();
    });
  }

  function deleteProduct(productId: string) {
    startTransition(async () => {
      const confirm = await appAlert.confirm(
        "Məhsul silinsin?",
        "Bu məhsul təsdiqlənmədən silinəcək və satıcıya bildiriş gedəcək.",
      );

      if (!confirm.isConfirmed) {
        return;
      }

      const formData = new FormData();
      formData.set("productId", productId);
      const result = await deletePendingProductAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Məhsul silinmədi");
        return;
      }

      void appAlert.success("Məhsul silindi", result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form action={saveSettings} className="grid gap-4 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-lg font-black">Dərc qaydası</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Satıcıların əlavə etdiyi yeni məhsulların saytda necə görünəcəyini seçin.
          </p>
        </div>
        <label className="flex items-start gap-3 rounded-lg border bg-background p-4 text-sm font-semibold">
          <input
            type="checkbox"
            name="requireApproval"
            defaultChecked={settings.requireApproval}
            className="mt-1 size-4 rounded border-input"
          />
          <span>
            Məhsullar təsdiq olduqdan sonra dərc olunsun
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              Söndürüləndə yeni məhsullar listə düşmədən birbaşa aktiv dərc olunur.
            </span>
          </span>
        </label>
        <Button type="submit" className="w-fit" disabled={isPending}>
          {isPending ? "Saxlanılır" : "Ayarı saxla"}
        </Button>
      </form>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black">Təsdiq gözləyən məhsullar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Yalnız təsdiq rejimi aktiv olanda əlavə edilən məhsullar burada görünür.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {visibleProducts.length} məhsul
          </span>
        </div>

        {!settings.requireApproval ? (
          <p className="mt-4 rounded-lg border bg-background p-8 text-center text-sm text-muted-foreground">
            Təsdiq rejimi söndürülüb. Yeni məhsullar təsdiq listinə düşmədən dərc olunur.
          </p>
        ) : visibleProducts.length === 0 ? (
          <p className="mt-4 rounded-lg border bg-background p-8 text-center text-sm text-muted-foreground">
            Təsdiq gözləyən məhsul yoxdur.
          </p>
        ) : (
          <div className="mt-4 divide-y overflow-hidden rounded-lg border bg-background">
            {visibleProducts.map((product) => {
              const managedProduct = managedProductMap.get(product.id);

              return (
              <article key={product.id} className="grid gap-4 p-4 lg:grid-cols-[88px_minmax(0,1fr)_auto] lg:items-center">
                <div className="size-20 overflow-hidden rounded-lg border bg-muted">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-base font-black">{product.name}</h3>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-700">
                      Təsdiq gözləyir
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {product.store.name} · {product.seller.name}
                    {product.seller.email ? ` · ${product.seller.email}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatMoney(product.priceAmount)} · Stok: {product.stockQuantity}
                  </p>
                  {product.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDetailProductId((current) =>
                        current === product.id ? null : product.id,
                      )
                    }
                  >
                    <Eye className="mr-2 size-4" aria-hidden="true" />
                    Detail
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingProductId((current) =>
                        current === product.id ? null : product.id,
                      )
                    }
                    disabled={isPending}
                  >
                      <Pencil className="mr-2 size-4" aria-hidden="true" />
                      Redaktə et
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => approve(product.id)}
                    disabled={isPending}
                  >
                    <Check className="mr-2 size-4" aria-hidden="true" />
                    Qəbul et
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectProduct(product)}
                    disabled={isPending}
                  >
                    Rədd et
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteProduct(product.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="mr-2 size-4" aria-hidden="true" />
                    Sil
                  </Button>
                </div>
                {detailProductId === product.id ? (
                  <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm lg:col-span-3 sm:grid-cols-2">
                    <div>
                      <p className="font-black">Məhsul məlumatı</p>
                      <p className="mt-1 text-muted-foreground">Slug: {product.slug}</p>
                      <p className="mt-1 text-muted-foreground">
                        Əlavə edildi: {formatDate(product.createdAt)}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {product.description || "Açıqlama yoxdur."}
                      </p>
                    </div>
                    <div>
                      <p className="font-black">Satıcı və mağaza</p>
                      <p className="mt-1 text-muted-foreground">{product.store.name}</p>
                      <p className="mt-1 text-muted-foreground">
                        Mağaza slug: {product.store.slug || "-"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {product.seller.name}
                        {product.seller.email ? ` · ${product.seller.email}` : ""}
                      </p>
                    </div>
                  </div>
                ) : null}
                {editingProductId === product.id ? (
                  <div className="lg:col-span-3">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="mb-3 text-sm font-black">Təsdiqdən əvvəl redaktə</p>
                      {managedProduct ? (
                        <ProductForm
                          mode="edit"
                          categories={categories}
                          product={managedProduct}
                          successRedirect="/radmin/new-products"
                        />
                      ) : (
                        <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                          Bu məhsulun edit məlumatı yüklənmədi.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
              );
            })}
          </div>
        )}
      </div>

      {rejectProduct ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Məhsulu rədd et">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b p-5">
              <div>
                <h2 className="text-lg font-black">Rədd səbəbi</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Yazdığınız qeyd satıcıya bildiriş və email kimi göndəriləcək.
                </p>
              </div>
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background text-muted-foreground hover:bg-accent"
                onClick={() => {
                  if (!isPending) {
                    setRejectProduct(null);
                    setNote("");
                  }
                }}
                aria-label="Bağla"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form
              className="grid gap-4 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                reject();
              }}
            >
              <label className="grid gap-2 text-sm font-semibold">
                Qeyd
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Boş saxlasanız default mesaj göndəriləcək."
                  className="min-h-28 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setRejectProduct(null);
                    setNote("");
                  }}
                >
                  Ləğv et
                </Button>
                <Button type="submit" variant="destructive" disabled={isPending}>
                  {isPending ? "Göndərilir" : "Rədd et və göndər"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
