"use client";

import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { createCheckoutOrdersAction, getCartProductsAction } from "@/lib/cart/actions";
import type { CartItem, CartProduct } from "@/lib/cart/types";
import type {
  DeliverySettings,
  DeliveryStoreOverride,
} from "@/lib/delivery/types";
import {
  findMatchingProductVariant,
  formatProductVariantSelection,
  getProductVariantKey,
  getProductVariantUnitPrice,
} from "@/lib/products/variant-utils";

const CART_KEY = "alisveris_cart";

type CartCheckoutProps = {
  products?: CartProduct[];
  defaultFullName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  isAuthenticated?: boolean;
  locale?: string;
  checkoutOnly?: boolean;
  deliverySettings: DeliverySettings;
  deliveryStoreOverrides: DeliveryStoreOverride[];
};

type DeliveryMethod = "pickup" | "courier" | "region";

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

function deleteCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("alisveris-cart-updated"));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

export function CartCheckout({
  products: initialProducts = [],
  defaultFullName = "",
  defaultPhone = "",
  defaultAddress = "",
  isAuthenticated = false,
  locale = "az",
  checkoutOnly = false,
  deliverySettings,
  deliveryStoreOverrides,
}: CartCheckoutProps) {
  const common = useTranslations("common");
  const cartUi = useTranslations("cartUi");
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<CartProduct[]>(initialProducts);
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("courier");
  const [hasLoadedCart, setHasLoadedCart] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
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
    const unit = getProductVariantUnitPrice({
      priceAmount: entry.product.priceAmount,
      discountAmount: entry.product.discountAmount,
      variants: entry.product.variantCombinations,
      selection: entry.item.selectedOptions,
    });

    return sum + unit * entry.item.quantity;
  }, 0);
  const deliverySummary = useMemo(() => {
    const storeSubtotals = new Map<string, number>();
    const overrides = new Map(
      deliveryStoreOverrides.map((override) => [override.storeId, override]),
    );

    for (const { item, product } of visibleItems) {
      const unitPrice = getProductVariantUnitPrice({
        priceAmount: product.priceAmount,
        discountAmount: product.discountAmount,
        variants: product.variantCombinations,
        selection: item.selectedOptions,
      });

      storeSubtotals.set(
        product.storeId,
        (storeSubtotals.get(product.storeId) ?? 0) + unitPrice * item.quantity,
      );
    }

    let amount = 0;
    const estimates = new Set<string>();

    for (const [storeId, subtotal] of storeSubtotals) {
      const override = overrides.get(storeId);
      const freeDeliveryThreshold =
        override?.freeDeliveryThreshold ?? deliverySettings.freeDeliveryThreshold;
      const price =
        deliveryMethod === "pickup"
          ? 0
          : deliveryMethod === "courier"
            ? (override?.bakuPrice ?? deliverySettings.bakuPrice)
            : (override?.regionPrice ?? deliverySettings.regionPrice);
      const estimate =
        deliveryMethod === "pickup"
          ? (override?.pickupEstimate ?? deliverySettings.pickupEstimate)
          : deliveryMethod === "courier"
            ? (override?.courierEstimate ?? deliverySettings.courierEstimate)
            : (override?.regionEstimate ?? deliverySettings.regionEstimate);

      amount +=
        freeDeliveryThreshold !== null && subtotal >= freeDeliveryThreshold
          ? 0
          : price;

      if (estimate) {
        estimates.add(estimate);
      }
    }

    return {
      amount,
      estimate: Array.from(estimates).join(" · "),
    };
  }, [deliveryMethod, deliverySettings, deliveryStoreOverrides, visibleItems]);
  const firstProduct = visibleItems[0]?.product;
  const returnHref =
    firstProduct?.storeSlug && firstProduct?.slug
      ? `/${firstProduct.storeSlug}/products/${firstProduct.slug}`
      : "/products";
  const isCartReady = hasLoadedCart && !isLoadingProducts;
  const isEmptyCart = isCartReady && visibleItems.length === 0;

  useEffect(() => {
    setCheckoutRequestId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const cartItems = readCart();
    const productIds = cartItems.map((item) => item.productId);

    setItems(cartItems);
    setHasLoadedCart(true);

    if (initialProducts.length > 0 || productIds.length === 0) {
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingProducts(true);
    getCartProductsAction(productIds, locale)
      .then((nextProducts) => {
        if (isMounted) {
          setProducts(nextProducts);

          const availableProductIds = new Set(nextProducts.map((product) => product.id));
          const nextItems = cartItems.filter((item) => availableProductIds.has(item.productId));

          if (nextItems.length !== cartItems.length) {
            setItems(nextItems);
            writeCart(nextItems);
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialProducts.length, locale]);

  function updateItems(nextItems: CartItem[]) {
    setItems(nextItems);
    writeCart(nextItems);
  }

  async function removeCartItem(itemKey: string, productName: string) {
    const confirmed = await appAlert.confirm({
      title: "Məhsul səbətdən silinsin?",
      message: `"${productName}" məhsulunu səbətdən silmək istədiyinizə əminsiniz?`,
      confirmText: "Sil",
      cancelText: "Ləğv et",
      variant: "danger",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    updateItems(
      items.filter(
        (nextItem) =>
          getProductVariantKey(
            nextItem.productId,
            nextItem.selectedOptions,
          ) !== itemKey,
      ),
    );
    void appAlert.success("Məhsul silindi", "Məhsul səbətdən silindi.");
  }

  async function clearCart() {
    const confirmed = await appAlert.confirm({
      title: "Səbət boşaldılsın?",
      message: "Səbətdəki bütün məhsulları silmək istədiyinizə əminsiniz?",
      confirmText: "Boşalt",
      cancelText: "Ləğv et",
      variant: "danger",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    updateItems([]);
    void appAlert.success("Səbət boşaldıldı", "Bütün məhsullar səbətdən silindi.");
  }

  async function removeCart() {
    const confirmed = await appAlert.confirm({
      title: "Səbət silinsin?",
      message: "Səbəti tam silmək istədiyinizə əminsiniz?",
      confirmText: "Səbəti sil",
      cancelText: "Ləğv et",
      variant: "danger",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    setItems([]);
    deleteCart();
    void appAlert.success("Səbət silindi", "Səbət məlumatları təmizləndi.");
  }

  function handleSubmit(formData: FormData) {
    const requestId = checkoutRequestId || crypto.randomUUID();

    formData.set("items", JSON.stringify(items));
    formData.set("checkoutRequestId", requestId);

    startTransition(async () => {
      const result = await createCheckoutOrdersAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Sifariş alınmadı");
        return;
      }

      updateItems([]);
      setCheckoutRequestId(crypto.randomUUID());
      void appAlert.success("Sifariş yaradıldı", result.message);
      router.replace(result.isGuest ? "/products" : "/dashboard");
      router.refresh();
    });
  }

  if (!isCartReady) {
    return (
      <main
        className="min-h-screen bg-slate-50 pb-[calc(6rem+env(safe-area-inset-bottom))] dark:bg-background md:pb-0"
        aria-busy="true"
      >
        <div className="container grid min-h-[38dvh] place-items-center py-8">
          <span className="size-8 animate-spin rounded-full border-[3px] border-muted border-t-primary" aria-label="Səbət açılır" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-[calc(6rem+env(safe-area-inset-bottom))] md:bg-background md:pb-0">
      <div
        className={
          checkoutOnly
            ? "container flex justify-center py-8"
            : isEmptyCart
              ? "container py-6 md:py-8"
              : "container grid gap-5 py-5 md:gap-6 md:py-8 lg:grid-cols-[1fr_420px]"
        }
      >
        {!checkoutOnly ? (
        <section className="rounded-none border-0 bg-white p-0 text-card-foreground shadow-none md:rounded-md md:border md:bg-card md:p-4 md:shadow-sm">
          <div className="flex flex-col gap-3 px-1 pb-4 md:px-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                <Link href={returnHref}>
                  <ArrowLeft className="mr-2 size-5" aria-hidden="true" />
                  {common("back")}
                </Link>
              </Button>
              <h1 className="text-center text-3xl font-black tracking-normal text-[hsl(var(--marketplace-navy))] sm:text-left md:text-2xl md:font-semibold md:text-foreground">
                {common("cart")}
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/products">Bütün məhsullar</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={visibleItems.length === 0}
                onClick={() => void clearCart()}
              >
                Səbəti boşalt
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={visibleItems.length === 0}
                onClick={() => void removeCart()}
              >
                Səbəti sil
              </Button>
            </div>
          </div>
          <div className="mt-2 divide-y bg-white md:mt-6 md:bg-transparent">
            {visibleItems.length === 0 ? (
              <div className="grid place-items-center gap-3 py-12 text-center text-sm text-muted-foreground">
                <span className="grid size-14 place-items-center rounded-full bg-muted text-primary">
                  <ShoppingCart className="size-7" aria-hidden="true" />
                </span>
                <p>{cartUi("empty")}</p>
              </div>
            ) : (
              visibleItems.map(({ item, product }) => {
                const itemKey = getProductVariantKey(product.id, item.selectedOptions);
                const selectedVariantLabel = formatProductVariantSelection(
                  product.options,
                  item.selectedOptions,
                );
                const unitPrice = getProductVariantUnitPrice({
                  priceAmount: product.priceAmount,
                  discountAmount: product.discountAmount,
                  variants: product.variantCombinations,
                  selection: item.selectedOptions,
                });
                const selectedVariant = findMatchingProductVariant(
                  product.variantCombinations,
                  item.selectedOptions,
                );
                const stockLimit =
                  selectedVariant?.stockQuantity ?? product.stockQuantity;

                return (
                  <div
                  key={itemKey}
                  className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 py-5 sm:flex sm:flex-row sm:items-center"
                >
                  <div className="size-24 overflow-hidden rounded-md bg-white sm:size-20 sm:border sm:bg-muted">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain sm:object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-lg font-semibold leading-6 text-[hsl(var(--marketplace-navy))] sm:truncate sm:text-sm sm:font-medium sm:text-foreground">
                      {product.name}
                    </h2>
                    <p className="mt-2 text-lg font-black text-[hsl(var(--marketplace-primary))] sm:mt-1 sm:text-sm sm:font-normal sm:text-muted-foreground">
                      {formatMoney(unitPrice)}
                    </p>
                    {selectedVariantLabel.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedVariantLabel.map((label) => (
                          <span
                            key={label}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="col-start-2 flex items-center gap-1.5 sm:gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11 rounded-none sm:size-14 sm:rounded-md"
                      onClick={() => {
                        updateItems(
                          items.map((nextItem) =>
                            getProductVariantKey(
                              nextItem.productId,
                              nextItem.selectedOptions,
                            ) === itemKey
                              ? {
                                  ...nextItem,
                                  quantity: Math.max(nextItem.quantity - 1, 1),
                                }
                              : nextItem,
                          ),
                        );
                      }}
                    >
                      <Minus className="size-5" aria-hidden="true" />
                    </Button>
                    <span className="w-10 text-center text-lg font-semibold sm:text-base">
                      {item.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11 rounded-none sm:size-14 sm:rounded-md"
                      onClick={() => {
                        updateItems(
                          items.map((nextItem) =>
                            getProductVariantKey(
                              nextItem.productId,
                              nextItem.selectedOptions,
                            ) === itemKey
                              ? {
                                  ...nextItem,
                                  quantity: Math.min(
                                    nextItem.quantity + 1,
                                    stockLimit,
                                  ),
                                }
                              : nextItem,
                          ),
                        );
                      }}
                    >
                      <Plus className="size-5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-11 text-destructive hover:text-destructive sm:ml-0 sm:size-14"
                      onClick={() => void removeCartItem(itemKey, product.name)}
                    >
                      <Trash2 className="size-5" aria-hidden="true" />
                    </Button>
                  </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
        ) : null}

        {checkoutOnly && isEmptyCart ? (
          <section className="w-full max-w-xl rounded-md border bg-card p-6 text-center text-card-foreground shadow-sm">
            <h1 className="text-xl font-semibold tracking-normal">{cartUi("empty")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {cartUi("addProductFirst")}
            </p>
            <Button asChild className="mt-5">
              <Link href="/products">{cartUi("browseProducts")}</Link>
            </Button>
          </section>
        ) : null}

        {!isEmptyCart ? (
        <form
          action={handleSubmit}
          className={
            checkoutOnly
              ? "h-fit w-full max-w-xl rounded-md border bg-card p-4 text-card-foreground shadow-sm"
              : "h-fit rounded-md border bg-white p-4 text-card-foreground shadow-sm md:bg-card"
          }
        >
          {checkoutOnly ? (
            <Button asChild variant="outline" size="sm" className="mb-4">
              <Link href={returnHref}>
                <ArrowLeft className="mr-2 size-5" aria-hidden="true" />
                Məhsula qayıt
              </Link>
            </Button>
          ) : null}
          <h2 className="text-lg font-semibold tracking-normal">{cartUi("confirmOrder")}</h2>
          <input type="hidden" name="items" value="" />
          <input type="hidden" name="checkoutRequestId" value={checkoutRequestId} />
          <div className="mt-4 grid gap-4">
            {isAuthenticated ? (
              <>
                <input type="hidden" name="fullName" value={defaultFullName} />
                <input type="hidden" name="phone" value={defaultPhone} />
              </>
            ) : (
              <>
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
                  <PhoneInput name="phone" defaultValue={defaultPhone} required />
                </label>
              </>
            )}
            <label className="grid gap-2 text-sm font-medium">
              Çatdırılma üsulu
              <select
                name="deliveryMethod"
                value={deliveryMethod}
                onChange={(event) =>
                  setDeliveryMethod(event.target.value as DeliveryMethod)
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="courier">Bakı daxili kuryer</option>
                <option value="region">Rayonlara çatdırılma</option>
                <option value="pickup">Mağazadan götür</option>
              </select>
            </label>
            {deliveryMethod === "region" ? (
              <label className="grid gap-2 text-sm font-medium">
                Rayon / region
                <input
                  name="deliveryRegion"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </label>
            ) : (
              <input type="hidden" name="deliveryRegion" value="" />
            )}
            <label className="grid gap-2 text-sm font-medium">
              Ünvan
              <textarea
                name="address"
                defaultValue={defaultAddress}
                className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required={deliveryMethod !== "pickup"}
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
            <span className="text-sm text-muted-foreground">Məhsullar</span>
            <span className="font-semibold">{formatMoney(total)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {deliveryMethod === "pickup" ? "Mağazadan özün götür" : "Çatdırılma"}
            </span>
            <span className="font-semibold">
              {deliveryMethod === "pickup"
                ? "Seçilib"
                : deliverySummary.amount === 0
                  ? "Pulsuz"
                  : formatMoney(deliverySummary.amount)}
            </span>
          </div>
          {deliverySummary.estimate ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Təxmini müddət: {deliverySummary.estimate}
            </p>
          ) : null}
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-sm font-medium">Yekun</span>
            <span className="text-base font-bold">
              {formatMoney(total + deliverySummary.amount)}
            </span>
          </div>
          <Button
            type="submit"
            className="mt-4 h-12 w-full bg-[hsl(var(--marketplace-primary))] text-base font-black hover:bg-[hsl(var(--marketplace-primary-hover))] md:bg-primary md:hover:bg-primary/90"
            disabled={visibleItems.length === 0 || isPending || isLoadingProducts}
          >
            {isPending ? "Sifariş yaradılır" : "Təsdiqlə"}
          </Button>
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href={returnHref}>Məhsula qayıt</Link>
          </Button>
        </form>
        ) : null}
      </div>
    </main>
  );
}
