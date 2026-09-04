"use client";

import { Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import {
  getClientAuthProfileOnce,
  useClientAuthProfileState,
} from "@/lib/auth/use-client-auth-profile";
import type { CartItem, CartProduct } from "@/lib/cart/types";
import {
  findMatchingProductVariant,
  getProductVariantKey,
  getRequiredSelectableProductOptions,
  normalizeProductVariantSelection,
} from "@/lib/products/variant-utils";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const CART_KEY = "alisveris_cart";
const BUY_NOW_KEY = "alisveris_buy_now";

function readCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("alisveris-cart-updated"));
}

function writeBuyNow(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(items));
}

function getCartQuantity(productId: string, selectedOptions?: Record<string, string>) {
  const key = getProductVariantKey(productId, selectedOptions);

  return (
    readCart().find(
      (item) => getProductVariantKey(item.productId, item.selectedOptions) === key,
    )?.quantity ?? 0
  );
}

function showCustomerRoleToast(t: ReturnType<typeof useTranslations>) {
  showToast({
    title: t("customerAccountRequired"),
    description: t("customerAccountRequiredDescription"),
    variant: "info",
  });
}

function canUseCustomerAction(
  viewerRole: AuthRole | null | undefined,
  t: ReturnType<typeof useTranslations>,
) {
  if (viewerRole && viewerRole !== "customer" && viewerRole !== "seller") {
    showCustomerRoleToast(t);
    return false;
  }

  return true;
}

export function AddToCartButton({
  product,
  viewerRole,
  selectedOptions,
  selectionReady = true,
  forceDetailSelection = false,
  className,
  disabled = false,
}: {
  product: CartProduct;
  viewerRole?: AuthRole | null;
  selectedOptions?: Record<string, string>;
  selectionReady?: boolean;
  forceDetailSelection?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("marketplace");
  const [quantity, setQuantity] = useState(0);
  const { profile, isResolved } = useClientAuthProfileState();
  const hasUser = isResolved ? profile.status === "authenticated" : null;
  const normalizedSelection = normalizeProductVariantSelection(selectedOptions);
  const selectedVariant = findMatchingProductVariant(
    product.variantCombinations ?? [],
    normalizedSelection,
  );
  const stockLimit = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const requiresSelection =
    forceDetailSelection ||
    getRequiredSelectableProductOptions(product.options ?? []).length > 0;
  const isUnavailable = disabled || stockLimit <= 0;

  useEffect(() => {
    setQuantity(getCartQuantity(product.id, normalizedSelection));

    function handleCartUpdate() {
      setQuantity(getCartQuantity(product.id, normalizedSelection));
    }

    window.addEventListener("alisveris-cart-updated", handleCartUpdate);

    return () => window.removeEventListener("alisveris-cart-updated", handleCartUpdate);
  }, [product.id, selectedOptions]);

  function emitCartToast(isSignedIn: boolean) {
    if (!isSignedIn) {
      showToast({
        title: t("cartAdded"),
        description: t("continueAfterLogin"),
        variant: "success",
      });
      return;
    }

    showToast({
      title: t("cartAdded"),
      description: t("productInCart"),
      variant: "success",
    });
  }

  function showCartToast() {
    if (hasUser !== null) {
      emitCartToast(hasUser);
      return;
    }

    void getClientAuthProfileOnce()
      .then((authProfile) => {
        emitCartToast(authProfile.status === "authenticated");
      })
      .catch(() => {
        emitCartToast(false);
      });
  }

  function updateQuantity(nextQuantity: number) {
    if (isUnavailable) {
      showToast({
        title: t("outOfStock"),
        variant: "warning",
      });
      return;
    }

    if (!canUseCustomerAction(viewerRole, t)) {
      return;
    }

    if (!selectionReady) {
      showToast({
        title: "Variant seçin",
        description: "Məhsulu səbətə əlavə etmək üçün seçimləri tamamlayın.",
        variant: "warning",
      });
      return;
    }

    if (requiresSelection && Object.keys(normalizedSelection).length === 0) {
      showToast({
        title: "Variant seçin",
        description: "Məhsulu səbətə əlavə etmək üçün seçimləri tamamlayın.",
        variant: "warning",
      });
      return;
    }

    const safeQuantity = Math.max(0, Math.min(nextQuantity, stockLimit));
    const items = readCart();
    const itemKey = getProductVariantKey(product.id, normalizedSelection);
    const existingIndex = items.findIndex(
      (item) => getProductVariantKey(item.productId, item.selectedOptions) === itemKey,
    );

    if (safeQuantity === 0) {
      const nextItems = items.filter(
        (item) => getProductVariantKey(item.productId, item.selectedOptions) !== itemKey,
      );
      writeCart(nextItems);
      setQuantity(0);
      return;
    }

    if (existingIndex >= 0) {
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: safeQuantity,
      };
    } else {
      items.push({
        productId: product.id,
        quantity: safeQuantity,
        selectedOptions: normalizedSelection,
        variantKey: itemKey,
      });
    }

    writeCart(items);
    setQuantity(safeQuantity);
  }

  function handleAdd() {
    if (quantity >= stockLimit) {
      showToast({
        title: t("stockLimitTitle"),
        description: t("stockLimitDescription"),
        variant: "warning",
      });
      return;
    }

    updateQuantity(quantity + 1);
    showCartToast();
  }

  function handleDecrease() {
    updateQuantity(quantity - 1);
  }

  if (quantity > 0 && !isUnavailable) {
    return (
      <div
        className={cn(
          "grid !h-11 min-h-11 min-w-0 grid-cols-[1.9rem_minmax(0,1fr)_1.9rem] items-center overflow-hidden rounded-xl border border-primary/25 !bg-primary !text-primary-foreground shadow-sm min-[360px]:grid-cols-[2.05rem_minmax(0,1fr)_2.05rem] sm:!h-12 sm:grid-cols-[2.25rem_minmax(0,1fr)_2.25rem]",
          className,
        )}
      >
        <button
          type="button"
          className="grid h-full min-h-11 place-items-center border-r border-primary-foreground/25 text-primary-foreground transition hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
          onClick={handleDecrease}
          aria-label={t("decreaseCartQuantity")}
        >
          <Minus className="size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
        </button>
        <span className="flex min-w-0 items-center justify-center px-0.5 text-center text-[10px] font-bold leading-tight !text-primary-foreground min-[360px]:px-1 min-[360px]:text-[11px] sm:text-sm">
          <span className="truncate whitespace-nowrap">{t("addedToCart")} ({quantity})</span>
        </span>
        <button
          type="button"
          className="grid h-full min-h-11 place-items-center border-l border-primary-foreground/25 text-primary-foreground transition hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={handleAdd}
          disabled={quantity >= stockLimit}
          aria-label={t("increaseCartQuantity")}
        >
          <Plus className="size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleAdd}
      disabled={isUnavailable}
      className={cn(
        "!h-11 min-h-11 min-w-0 justify-center gap-1.5 overflow-hidden rounded-xl px-2 text-[12px] font-black leading-none text-primary hover:text-primary min-[360px]:text-[13px] sm:!h-12 sm:gap-2 sm:px-4 sm:text-sm",
        className,
      )}
    >
      <ShoppingCart className="mr-0 size-5 shrink-0 stroke-[2.4] sm:mr-2" aria-hidden="true" />
      <span className="min-w-0 whitespace-nowrap">
        <span className="sm:hidden">{t("addToCart")}</span>
        <span className="hidden sm:inline">{t("addToCart")}</span>
      </span>
    </Button>
  );
}

export function BuyNowButton({
  product,
  viewerRole,
  selectedOptions,
  selectionReady = true,
  className,
  disabled = false,
}: {
  product: CartProduct;
  viewerRole?: AuthRole | null;
  selectedOptions?: Record<string, string>;
  selectionReady?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const checkoutPath = "/checkout?mode=buy-now";
  const normalizedSelection = normalizeProductVariantSelection(selectedOptions);
  const selectedVariant = findMatchingProductVariant(
    product.variantCombinations ?? [],
    normalizedSelection,
  );
  const stockLimit = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const isUnavailable = disabled || stockLimit <= 0;

  function handleBuyNow() {
    if (isUnavailable) {
      showToast({
        title: t("outOfStock"),
        variant: "warning",
      });
      return;
    }

    if (!canUseCustomerAction(viewerRole, t)) {
      return;
    }

    if (!selectionReady) {
      showToast({
        title: "Variant seçin",
        description: "Sifariş üçün seçimləri tamamlayın.",
        variant: "warning",
      });
      return;
    }

    writeBuyNow([
      {
        productId: product.id,
        quantity: 1,
        selectedOptions: normalizedSelection,
        variantKey: getProductVariantKey(product.id, normalizedSelection),
      },
    ]);

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    router.push(checkoutPath, { scroll: true });
  }

  return (
    <Button
      type="button"
      onClick={handleBuyNow}
      disabled={isUnavailable}
      className={cn("min-w-0", className)}
    >
      <Zap className="mr-2 size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
      <span className="truncate">{t("buyNow")}</span>
    </Button>
  );
}
