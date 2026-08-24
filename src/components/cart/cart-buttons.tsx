"use client";

import { Check, Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import type { CartItem, CartProduct } from "@/lib/cart/types";
import {
  findMatchingProductVariant,
  getProductVariantKey,
  getRequiredSelectableProductOptions,
  normalizeProductVariantSelection,
} from "@/lib/products/variant-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const CART_KEY = "alisveris_cart";
type AuthListener = (hasUser: boolean | null) => void;

const authListeners = new Set<AuthListener>();
let cachedHasUser: boolean | null = null;
let authWatcherStarted = false;

function setCachedHasUser(hasUser: boolean | null) {
  cachedHasUser = hasUser;
  authListeners.forEach((listener) => listener(hasUser));
}

function ensureAuthWatcher() {
  if (typeof window === "undefined" || authWatcherStarted) {
    return;
  }

  authWatcherStarted = true;
  const supabase = createSupabaseBrowserClient();

  void supabase.auth
    .getUser()
    .then(({ data }) => setCachedHasUser(Boolean(data.user)))
    .catch(() => setCachedHasUser(false));

  supabase.auth.onAuthStateChange((_event, session) => {
    setCachedHasUser(Boolean(session?.user));
  });
}

function useSharedAuthState() {
  const [hasUser, setHasUser] = useState(cachedHasUser);

  useEffect(() => {
    ensureAuthWatcher();
    setHasUser(cachedHasUser);
    authListeners.add(setHasUser);

    return () => {
      authListeners.delete(setHasUser);
    };
  }, []);

  return hasUser;
}

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
  const hasUser = useSharedAuthState();
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

    const supabase = createSupabaseBrowserClient();
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        const isSignedIn = Boolean(data.user);
        setCachedHasUser(isSignedIn);
        emitCartToast(isSignedIn);
      })
      .catch(() => {
        setCachedHasUser(false);
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
      const href =
        product.storeSlug && product.slug
          ? `/${product.storeSlug}/products/${product.slug}`
          : `/products/${product.slug}`;

      window.location.href = href;
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
          "grid !h-11 min-h-11 min-w-0 grid-cols-[2.15rem_minmax(0,1fr)_2.15rem] items-center overflow-hidden rounded-xl border border-primary/25 !bg-primary !text-primary-foreground shadow-sm sm:!h-12 sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]",
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
        <span className="flex min-w-0 items-center justify-center gap-0.5 px-1 text-center text-[11px] font-black leading-tight !text-primary-foreground min-[360px]:text-xs min-[390px]:gap-1 sm:text-sm">
          <Check className="hidden size-4 shrink-0 stroke-[2.5] min-[390px]:block" aria-hidden="true" />
          <span className="whitespace-nowrap">{t("addedToCart")}</span>
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
        "!h-11 min-h-11 min-w-0 justify-center gap-1.5 overflow-hidden rounded-xl px-2 text-[12px] font-black leading-none min-[360px]:text-[13px] sm:!h-12 sm:gap-2 sm:px-4 sm:text-sm",
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
  const checkoutPath = "/cart?mode=checkout";
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

    writeCart([
      {
        productId: product.id,
        quantity: 1,
        selectedOptions: normalizedSelection,
        variantKey: getProductVariantKey(product.id, normalizedSelection),
      },
    ]);

    router.push(checkoutPath);
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
