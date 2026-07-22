"use client";

import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  confirmPersonalListingPaymentAction,
  deleteProductAction,
} from "@/lib/products/actions";
import type { CategoryOption, ManagedProduct } from "@/lib/products/types";

type ProductListProps = {
  products: ManagedProduct[];
  categories: CategoryOption[];
  emptyTitle: string;
  emptyDescription: string;
  allowPaymentActivation?: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

function DeleteProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const confirm = await appAlert.confirm(
        "Məhsul silinsin?",
        "Bu əməliyyat məhsul qeydini siləcək.",
      );

      if (!confirm.isConfirmed) {
        return;
      }

      const formData = new FormData();
      formData.set("productId", productId);
      const result = await deleteProductAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Silinmədi");
        return;
      }

      void appAlert.success("Silindi", result.message);
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="mr-2 size-4" aria-hidden="true" />
      Sil
    </Button>
  );
}

function PaymentActivationButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleActivation() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("productId", productId);
      const result = await confirmPersonalListingPaymentAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Ödəniş alınmadı");
        return;
      }

      void appAlert.success("Elan aktivdir", result.message);
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleActivation}
      disabled={isPending}
    >
      <CreditCard className="mr-2 size-4" aria-hidden="true" />
      1 AZN ödənişi təsdiqlə
    </Button>
  );
}

export function ProductList({
  products,
  categories,
  emptyTitle,
  emptyDescription,
  allowPaymentActivation = false,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        className="rounded-md border bg-card p-8 shadow-sm"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <article
          key={product.id}
          className="rounded-md border bg-card p-4 text-card-foreground shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                {product.images[0] ? (
                  <img
                    src={product.images[0].url}
                    alt={product.images[0].altText ?? product.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-normal">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatMoney(product.priceAmount)}
                  {product.discountAmount > 0
                    ? ` · Endirim: ${formatMoney(product.discountAmount)}`
                    : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stok: {product.stockQuantity} · Status: {product.status}
                  {product.paymentStatus ? ` · Ödəniş: ${product.paymentStatus}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allowPaymentActivation &&
              product.listingType === "personal" &&
              product.paymentStatus !== "paid" ? (
                <PaymentActivationButton productId={product.id} />
              ) : null}
              <DeleteProductButton productId={product.id} />
            </div>
          </div>
          <details className="mt-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
              <Pencil className="size-4" aria-hidden="true" />
              Redaktə et
            </summary>
            <div className="mt-4">
              <ProductForm mode="edit" categories={categories} product={product} />
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}
