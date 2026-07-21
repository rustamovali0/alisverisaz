"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { createCheckoutOrdersAction } from "@/lib/cart/actions";
import type { CartItem, CartProduct } from "@/lib/cart/types";

const CART_KEY = "alisveris_cart";

type CartCheckoutProps = {
  products: CartProduct[];
  defaultFullName?: string;
};

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("alisveris-cart-updated"));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

export function CartCheckout({
  products,
  defaultFullName = "",
}: CartCheckoutProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const visibleItems = items
    .map((item) => ({
      item,
      product: productMap.get(item.productId),
    }))
    .filter((entry): entry is { item: CartItem; product: CartProduct } =>
      Boolean(entry.product),
    );
  const total = visibleItems.reduce((sum, entry) => {
    const unit = Math.max(
      entry.product.priceAmount - entry.product.discountAmount,
      0,
    );

    return sum + unit * entry.item.quantity;
  }, 0);

  useEffect(() => {
    setItems(readCart());
  }, []);

  function updateItems(nextItems: CartItem[]) {
    setItems(nextItems);
    writeCart(nextItems);
  }

  function handleSubmit(formData: FormData) {
    formData.set("items", JSON.stringify(items));

    startTransition(async () => {
      const result = await createCheckoutOrdersAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Sifariş alınmadı");
        return;
      }

      updateItems([]);
      await appAlert.success("Sifariş yaradıldı", result.message);
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container grid gap-6 py-8 lg:grid-cols-[1fr_420px]">
        <section className="rounded-md border bg-card p-4 text-card-foreground shadow-sm">
          <h1 className="text-2xl font-semibold tracking-normal">Səbət</h1>
          <div className="mt-6 divide-y">
            {visibleItems.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Səbət boşdur.
              </p>
            ) : (
              visibleItems.map(({ item, product }) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center"
                >
                  <div className="size-20 overflow-hidden rounded-md border bg-muted">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-medium">{product.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(
                        Math.max(product.priceAmount - product.discountAmount, 0),
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        updateItems(
                          items.map((nextItem) =>
                            nextItem.productId === product.id
                              ? {
                                  ...nextItem,
                                  quantity: Math.max(nextItem.quantity - 1, 1),
                                }
                              : nextItem,
                          ),
                        );
                      }}
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        updateItems(
                          items.map((nextItem) =>
                            nextItem.productId === product.id
                              ? {
                                  ...nextItem,
                                  quantity: Math.min(
                                    nextItem.quantity + 1,
                                    product.stockQuantity,
                                  ),
                                }
                              : nextItem,
                          ),
                        );
                      }}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        updateItems(
                          items.filter((nextItem) => nextItem.productId !== product.id),
                        );
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <form
          action={handleSubmit}
          className="h-fit rounded-md border bg-card p-4 text-card-foreground shadow-sm"
        >
          <h2 className="text-lg font-semibold tracking-normal">Sifarişi təsdiqlə</h2>
          <input type="hidden" name="items" value="" />
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Ad Soyad
              <input
                name="fullName"
                defaultValue={defaultFullName}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Telefon
              <input
                name="phone"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Ünvan
              <textarea
                name="address"
                className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Qeyd
              <textarea
                name="note"
                className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Cəmi</span>
            <span className="font-semibold">{formatMoney(total)}</span>
          </div>
          <Button
            type="submit"
            className="mt-4 w-full"
            disabled={visibleItems.length === 0 || isPending}
          >
            {isPending ? "Sifariş yaradılır" : "Təsdiqlə"}
          </Button>
        </form>
      </div>
    </main>
  );
}
