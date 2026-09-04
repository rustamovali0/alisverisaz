"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  createCheckoutOrdersAction,
  getAvailablePromoStoreIdsAction,
  getCartProductsAction,
  previewCheckoutPromosAction,
} from "@/lib/cart/actions";
import type {
  CartItem,
  CartProduct,
  WhatsAppCheckoutGroup,
} from "@/lib/cart/types";
import type { CheckoutPromoPreview } from "@/lib/promos/types";
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
const BUY_NOW_KEY = "alisveris_buy_now";

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

type CheckoutResultState = {
  message: string;
  orderIds: string[];
  whatsappGroups: WhatsAppCheckoutGroup[];
  isGuest?: boolean;
};

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function readBuyNowCart() {
  try {
    return JSON.parse(sessionStorage.getItem(BUY_NOW_KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function writeBuyNowCart(items: CartItem[]) {
  sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(items));
}

function isBuyNowCheckout() {
  return new URLSearchParams(window.location.search).get("mode") === "buy-now";
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
  const [usesBuyNowCart, setUsesBuyNowCart] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResultState | null>(null);
  const [promoEnabledStoreIds, setPromoEnabledStoreIds] = useState<string[]>([]);
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({});
  const [appliedPromos, setAppliedPromos] = useState<Record<string, CheckoutPromoPreview>>({});
  const [isPending, startTransition] = useTransition();
  const [isPromoPending, startPromoTransition] = useTransition();
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
  const storeGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        storeId: string;
        storeName: string;
        subtotal: number;
      }
    >();

    for (const { item, product } of visibleItems) {
      const unit = getProductVariantUnitPrice({
        priceAmount: product.priceAmount,
        discountAmount: product.discountAmount,
        variants: product.variantCombinations,
        selection: item.selectedOptions,
      });
      const current = groups.get(product.storeId) ?? {
        storeId: product.storeId,
        storeName: product.storeName ?? "Mağaza",
        subtotal: 0,
      };

      current.subtotal += unit * item.quantity;
      groups.set(product.storeId, current);
    }

    return Array.from(groups.values());
  }, [visibleItems]);
  const promoDiscountTotal = Object.values(appliedPromos).reduce(
    (sum, promo) => sum + promo.discountAmount,
    0,
  );
  const storeGroupKey = useMemo(
    () => storeGroups.map((group) => group.storeId).sort().join("|"),
    [storeGroups],
  );
  const promoEnabledStoreIdSet = useMemo(
    () => new Set(promoEnabledStoreIds),
    [promoEnabledStoreIds],
  );
  const promoEligibleGroups = useMemo(
    () => storeGroups.filter((group) => promoEnabledStoreIdSet.has(group.storeId)),
    [promoEnabledStoreIdSet, storeGroups],
  );
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
    const nextUsesBuyNowCart = checkoutOnly && isBuyNowCheckout();
    const cartItems = nextUsesBuyNowCart ? readBuyNowCart() : readCart();
    const productIds = cartItems.map((item) => item.productId);

    setUsesBuyNowCart(nextUsesBuyNowCart);
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
            if (nextUsesBuyNowCart) {
              writeBuyNowCart(nextItems);
            } else {
              writeCart(nextItems);
            }
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
  }, [checkoutOnly, initialProducts.length, locale]);

  useEffect(() => {
    const storeIds = storeGroupKey ? storeGroupKey.split("|") : [];

    if (storeIds.length === 0) {
      setPromoEnabledStoreIds([]);
      setPromoCodes({});
      setAppliedPromos({});
      return;
    }

    let isMounted = true;

    getAvailablePromoStoreIdsAction(storeIds)
      .then((availableStoreIds) => {
        if (!isMounted) {
          return;
        }

        const availableSet = new Set(availableStoreIds);

        setPromoEnabledStoreIds(availableStoreIds);
        setPromoCodes((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([storeId]) => availableSet.has(storeId)),
          ),
        );
        setAppliedPromos((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([storeId]) => availableSet.has(storeId)),
          ),
        );
      })
      .catch(() => {
        if (isMounted) {
          setPromoEnabledStoreIds([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [storeGroupKey]);

  function updateItems(nextItems: CartItem[]) {
    setItems(nextItems);
    setAppliedPromos({});
    if (usesBuyNowCart) {
      writeBuyNowCart(nextItems);
    } else {
      writeCart(nextItems);
    }
  }

  function setPromoCode(storeId: string, code: string) {
    setPromoCodes((current) => ({
      ...current,
      [storeId]: code,
    }));
    setAppliedPromos((current) => {
      if (!current[storeId]) {
        return current;
      }

      const next = { ...current };

      delete next[storeId];
      return next;
    });
  }

  function applyPromo(storeId: string) {
    const code = (promoCodes[storeId] ?? "").trim();

    if (!code) {
      void appAlert.error("Promo kod daxil edin.", "Promo tətbiq olunmadı");
      return;
    }

    const formData = new FormData();

    formData.set("items", JSON.stringify(items));
    formData.set("promoCodes", JSON.stringify({ [storeId]: code }));

    startPromoTransition(async () => {
      const result = await previewCheckoutPromosAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Promo tətbiq olunmadı");
        return;
      }

      const promo = result.promos.find((item) => item.storeId === storeId);

      if (!promo) {
        void appAlert.error("Promo kod etibarsızdır.", "Promo tətbiq olunmadı");
        return;
      }

      setAppliedPromos((current) => ({
        ...current,
        [storeId]: promo,
      }));
      void appAlert.success("Promo tətbiq edildi", `${promo.code} promo kodu aktivdir.`);
    });
  }

  function removePromo(storeId: string) {
    setPromoCodes((current) => ({
      ...current,
      [storeId]: "",
    }));
    setAppliedPromos((current) => {
      const next = { ...current };

      delete next[storeId];
      return next;
    });
  }

  function removeItemsByKeys(itemKeys: string[]) {
    if (itemKeys.length === 0) {
      return;
    }

    const keySet = new Set(itemKeys);
    const sourceItems = usesBuyNowCart ? readBuyNowCart() : readCart();
    const nextItems = sourceItems.filter(
      (item) => !keySet.has(getProductVariantKey(item.productId, item.selectedOptions)),
    );

    updateItems(nextItems);
  }

  function openWhatsAppGroup(group: WhatsAppCheckoutGroup) {
    removeItemsByKeys(group.itemKeys);
    setCheckoutResult((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        whatsappGroups: current.whatsappGroups.filter(
          (nextGroup) => nextGroup.storeId !== group.storeId,
        ),
      };
    });

    const opened = window.open(group.whatsappUrl, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = group.whatsappUrl;
      return;
    }

    void appAlert.success(
      "WhatsApp açıldı",
      `${group.storeName} üçün sifariş mesajı hazırlandı.`,
    );
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

  function handleSubmit(formData: FormData) {
    const requestId = checkoutRequestId || crypto.randomUUID();
    const submittedPromoCodes = Object.fromEntries(
      Object.entries(appliedPromos).map(([storeId, promo]) => [storeId, promo.code]),
    );

    formData.set("items", JSON.stringify(items));
    formData.set("checkoutRequestId", requestId);
    formData.set("promoCodes", JSON.stringify(submittedPromoCodes));

    startTransition(async () => {
      const result = await createCheckoutOrdersAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Sifariş alınmadı");
        return;
      }

      const whatsappGroups = result.whatsappGroups ?? [];
      const processedItemKeys = result.processedItemKeys ?? [];

      setCheckoutRequestId(crypto.randomUUID());
      void appAlert.success("Sifariş yaradıldı", result.message);

      if (whatsappGroups.length > 0) {
        removeItemsByKeys(processedItemKeys);
        setCheckoutResult({
          message: result.message,
          orderIds: result.orderIds,
          whatsappGroups,
          isGuest: result.isGuest,
        });
        router.refresh();
        return;
      }

      updateItems([]);
      router.replace(result.isGuest ? (usesBuyNowCart ? "/" : "/products") : "/dashboard");
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

  if (checkoutResult) {
    const hasWhatsAppGroups = checkoutResult.whatsappGroups.length > 0;

    return (
      <main className="min-h-screen bg-slate-50 pb-[calc(6rem+env(safe-area-inset-bottom))] dark:bg-background md:pb-0">
        <div className="container flex justify-center py-6 md:py-10">
          <section className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card dark:text-slate-100 md:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-slate-100">
                  Sifariş nəticəsi
                </h1>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {checkoutResult.message}
                </p>
              </div>
            </div>

            {checkoutResult.orderIds.length > 0 ? (
              <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Sayt üzərindən olan sifarişlər yaradıldı və satıcı panelinə göndərildi.
              </div>
            ) : null}

            {hasWhatsAppGroups ? (
              <div className="mt-5 grid gap-4">
                {checkoutResult.whatsappGroups.map((group) => (
                  <article
                    key={group.storeId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">WhatsApp satıcı</p>
                        <h2 className="text-xl font-semibold tracking-normal">
                          {group.storeName}
                        </h2>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">Ümumi məbləğ</p>
                        <p className="text-lg font-bold">{formatMoney(group.totalAmount)}</p>
                      </div>
                    </div>
                    <div className="mt-4 divide-y rounded-md border">
                      {group.products.map((product, index) => (
                        <div
                          key={`${group.storeId}-${product.name}-${index}`}
                          className="grid gap-1 p-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-medium">{product.name}</span>
                            <span className="shrink-0 font-semibold">
                              {formatMoney(product.totalAmount)}
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            {product.quantity} ədəd × {formatMoney(product.unitPrice)}
                          </p>
                          {product.variantLabels.length > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {product.variantLabels.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {group.promo ? (
                      <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        <div className="flex justify-between gap-3">
                          <span>Ara cəm</span>
                          <span>{formatMoney(group.subtotalAmount)}</span>
                        </div>
                        <div className="mt-1 flex justify-between gap-3">
                          <span>
                            Promo: {group.promo.code} (-{group.promo.discountPercent}%)
                          </span>
                          <span>-{formatMoney(group.promo.discountAmount)}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3 border-t border-emerald-200 pt-2 font-bold">
                          <span>Yeni cəm</span>
                          <span>{formatMoney(group.totalAmount)}</span>
                        </div>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      className="mt-4 h-11 w-full rounded-[10px] bg-blue-600 font-semibold text-white shadow-none hover:bg-blue-700 hover:text-white"
                      onClick={() => openWhatsAppGroup(group)}
                    >
                      WhatsApp-da sifarişi tamamla
                      <ExternalLink className="ml-2 size-4" aria-hidden="true" />
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-md border bg-background p-5 text-center">
                <h2 className="text-lg font-semibold tracking-normal">
                  WhatsApp sifarişləri tamamlandı
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Səbətdə emal olunan məhsullar təmizləndi.
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
              <Button asChild variant="outline">
                <Link href="/products">Məhsullara qayıt</Link>
              </Button>
              {!checkoutResult.isGuest ? (
                <Button asChild>
                  <Link href="/dashboard">Hesabıma keç</Link>
                </Button>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
      <main className="min-h-screen bg-slate-50 pb-[calc(6rem+env(safe-area-inset-bottom))] dark:bg-background md:pb-0">
      <div
        className={
          checkoutOnly
            ? "container flex justify-center py-8"
            : isEmptyCart
              ? "container py-6 md:py-8"
            : "container mx-auto grid max-w-[1280px] gap-5 py-5 md:gap-6 md:py-8 lg:grid-cols-[minmax(0,1fr)_400px]"
        }
      >
        {!checkoutOnly ? (
        <section className="rounded-none border-0 bg-transparent p-0 text-slate-950 shadow-none dark:text-slate-100 md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-5 md:shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:md:border-slate-800 dark:md:bg-card">
          <div className="flex flex-col gap-3 px-1 pb-4 md:px-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="outline" size="sm" className="hidden rounded-[10px] border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:inline-flex">
                <Link href={returnHref}>
                  <ArrowLeft className="mr-2 size-5" aria-hidden="true" />
                  {common("back")}
                </Link>
              </Button>
              <h1 className="text-center text-3xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-left md:text-2xl">
                {common("cart")}
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button asChild variant="outline" size="sm" className="rounded-[10px] border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                <Link href="/products">Bütün məhsullar</Link>
              </Button>
            </div>
          </div>
          <div className="mt-2 grid gap-3 bg-transparent md:mt-6">
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
                  className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card sm:flex sm:flex-row sm:items-center sm:p-4"
                >
                  <div className="size-[92px] overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 sm:size-20">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-base font-semibold leading-6 text-slate-950 dark:text-slate-100 sm:truncate">
                      {product.name}
                    </h2>
                    <p className="mt-2 text-base font-semibold text-blue-700 dark:text-blue-300 sm:mt-1">
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
                      className="size-10 rounded-[10px] border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:size-11"
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
                      className="size-10 rounded-[10px] border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:size-11"
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
                      className="ml-auto size-12 rounded-[10px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 sm:ml-0 sm:size-11"
                      onClick={() => void removeCartItem(itemKey, product.name)}
                    >
                      <Trash2 className="size-6 sm:size-5" aria-hidden="true" />
                    </Button>
                  </div>
                  </div>
                );
              })
            )}
          </div>
          {visibleItems.length > 0 ? (
            <div className="flex justify-end bg-transparent px-1 py-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[10px] border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:bg-transparent dark:hover:bg-rose-950/30"
                onClick={() => void clearCart()}
              >
                <Trash2 className="mr-2 size-5" aria-hidden="true" />
                Səbəti boşalt
              </Button>
            </div>
          ) : null}
        </section>
        ) : null}

        {checkoutOnly && isEmptyCart ? (
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card dark:text-slate-100">
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
              ? "h-fit w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card dark:text-slate-100"
              : "h-fit rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card dark:text-slate-100 md:p-5"
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
          <h2 className="text-lg font-semibold tracking-normal text-slate-950 dark:text-slate-100">{cartUi("confirmOrder")}</h2>
          <input type="hidden" name="items" value="" />
          <input type="hidden" name="checkoutRequestId" value={checkoutRequestId} />
          <input type="hidden" name="promoCodes" value="" />
          <div className="mt-4 grid gap-4">
            {promoEligibleGroups.length > 0 ? (
              <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                <div>
                  <h3 className="text-sm font-black">Promo kod</h3>
                </div>
                {promoEligibleGroups.map((group) => {
                  const promo = appliedPromos[group.storeId];

                  return (
                    <div key={group.storeId} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{group.storeName}</p>
                          <p className="text-xs text-muted-foreground">
                            Ara cəm: {formatMoney(group.subtotal)}
                          </p>
                        </div>
                        {promo ? (
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                            onClick={() => removePromo(group.storeId)}
                          >
                            Sil
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          value={promoCodes[group.storeId] ?? ""}
                          onChange={(event) =>
                            setPromoCode(group.storeId, event.target.value)
                          }
                          placeholder="Promo kod"
                          className="h-10 rounded-[10px] border border-slate-200 bg-white px-3 text-sm uppercase outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-slate-800 dark:bg-slate-950"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-[10px] border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => applyPromo(group.storeId)}
                          disabled={isPromoPending}
                        >
                          Tətbiq et
                        </Button>
                      </div>
                      {promo ? (
                        <div className="grid gap-1 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800">
                          <div className="flex justify-between gap-3">
                            <span>Promo: {promo.code} (-{promo.discountPercent}%)</span>
                            <span>-{formatMoney(promo.discountAmount)}</span>
                          </div>
                          <div className="flex justify-between gap-3 font-bold">
                            <span>Yeni cəm</span>
                            <span>{formatMoney(promo.totalAfterDiscount)}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ) : null}
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
          {promoDiscountTotal > 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-emerald-700">
              <span>Promo endirimi</span>
              <span className="font-semibold">-{formatMoney(promoDiscountTotal)}</span>
            </div>
          ) : null}
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
              {formatMoney(total - promoDiscountTotal + deliverySummary.amount)}
            </span>
          </div>
          <Button
            type="submit"
            className="mt-4 h-12 w-full rounded-[10px] bg-blue-600 text-base font-semibold text-white shadow-none hover:bg-blue-700 hover:text-white"
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
