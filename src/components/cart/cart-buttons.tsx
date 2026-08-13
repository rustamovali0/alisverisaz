"use client";

import { Check, Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import type { CartProduct } from "@/lib/cart/types";
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

function readCart() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as Array<{
      productId: string;
      quantity: number;
    }>;
  } catch {
    return [];
  }
}

function writeCart(items: Array<{ productId: string; quantity: number }>) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("alisveris-cart-updated"));
}

function getCartQuantity(productId: string) {
  return readCart().find((item) => item.productId === productId)?.quantity ?? 0;
}

function requireCustomerRole(viewerRole?: AuthRole | null) {
  if (viewerRole && viewerRole !== "customer") {
    showToast({
      title: "İstifadəçi hesabı lazımdır",
      description: "Bu əməliyyat üçün zəhmət olmasa istifadəçi hesabı ilə giriş edin.",
      variant: "info",
    });
    return false;
  }

  return true;
}

export function AddToCartButton({
  product,
  viewerRole,
  className,
  disabled = false,
}: {
  product: CartProduct;
  viewerRole?: AuthRole | null;
  className?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("marketplace");
  const [quantity, setQuantity] = useState(0);
  const hasUser = useSharedAuthState();
  const isUnavailable = disabled || product.stockQuantity <= 0;

  useEffect(() => {
    setQuantity(getCartQuantity(product.id));

    function handleCartUpdate() {
      setQuantity(getCartQuantity(product.id));
    }

    window.addEventListener("alisveris-cart-updated", handleCartUpdate);

    return () => window.removeEventListener("alisveris-cart-updated", handleCartUpdate);
  }, [product.id]);

  function emitCartToast(isSignedIn: boolean) {
    if (!isSignedIn) {
      showToast({
        title: "Səbətə əlavə edildi",
        description: "Alış-verişə davam etmək üçün daxil olun.",
        variant: "success",
      });
      return;
    }

    showToast({
      title: "Məhsul səbətə əlavə edildi",
      description: "Məhsul səbətinizdədir.",
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
        title: "Bu məhsul hazırda stokda yoxdur.",
        variant: "warning",
      });
      return;
    }

    if (!requireCustomerRole(viewerRole)) {
      return;
    }

    const safeQuantity = Math.max(0, Math.min(nextQuantity, product.stockQuantity));
    const items = readCart();
    const existingIndex = items.findIndex((item) => item.productId === product.id);

    if (safeQuantity === 0) {
      const nextItems = items.filter((item) => item.productId !== product.id);
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
      });
    }

    writeCart(items);
    setQuantity(safeQuantity);
  }

  function handleAdd() {
    if (quantity >= product.stockQuantity) {
      showToast({
        title: "Stok limiti keçilə bilməz.",
        description: "Səbətdəki say hazırkı stok miqdarına bərabərdir.",
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
          "grid h-11 min-w-0 grid-cols-[2.15rem_minmax(0,1fr)_2.15rem] items-center overflow-hidden rounded-xl border border-primary/25 bg-primary text-primary-foreground shadow-sm sm:h-12 sm:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]",
          className,
        )}
      >
        <button
          type="button"
          className="grid h-full min-h-11 place-items-center border-r border-primary-foreground/25 text-primary-foreground transition hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
          onClick={handleDecrease}
          aria-label="Səbətdəki sayı azalt"
        >
          <Minus className="size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
        </button>
        <span className="flex min-w-0 items-center justify-center gap-0.5 px-0.5 text-center text-[11px] font-black leading-tight text-primary-foreground min-[390px]:gap-1 min-[390px]:text-xs sm:text-sm">
          <Check className="hidden size-4 shrink-0 stroke-[2.5] min-[390px]:block" aria-hidden="true" />
          <span className="hidden truncate sm:inline">Səbətə əlavə edilib</span>
          <span className="whitespace-nowrap sm:hidden">Səbət</span>
          <span className="shrink-0">({quantity})</span>
        </span>
        <button
          type="button"
          className="grid h-full min-h-11 place-items-center border-l border-primary-foreground/25 text-primary-foreground transition hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={handleAdd}
          disabled={quantity >= product.stockQuantity}
          aria-label="Səbətdəki sayı artır"
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
        "h-11 min-w-0 gap-1.5 overflow-hidden rounded-xl px-2 text-sm font-black sm:h-12 sm:gap-2 sm:px-4",
        className,
      )}
    >
      <ShoppingCart className="mr-0 size-5 shrink-0 stroke-[2.4] sm:mr-2" aria-hidden="true" />
      <span className="min-w-0 truncate">
        <span className="sm:hidden">Səbətə</span>
        <span className="hidden sm:inline">{t("addToCart")}</span>
      </span>
    </Button>
  );
}

export function BuyNowButton({
  product,
  viewerRole,
  className,
  disabled = false,
}: {
  product: CartProduct;
  viewerRole?: AuthRole | null;
  className?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const checkoutPath = "/cart?mode=checkout";
  const isUnavailable = disabled || product.stockQuantity <= 0;

  async function handleBuyNow() {
    if (isUnavailable) {
      showToast({
        title: "Bu məhsul hazırda stokda yoxdur.",
        variant: "warning",
      });
      return;
    }

    if (!requireCustomerRole(viewerRole)) {
      return;
    }

    writeCart([
      {
        productId: product.id,
        quantity: 1,
      },
    ]);

    setIsChecking(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setIsChecking(false);

    if (!user) {
      showToast({
        title: "Giriş tələb olunur",
        description: "Sifarişi tamamlamaq üçün zəhmət olmasa giriş edin.",
        variant: "info",
      });
      router.push(`/login?next=${encodeURIComponent(checkoutPath)}`);
      return;
    }

    router.push(checkoutPath);
  }

  return (
    <Button
      type="button"
      onClick={handleBuyNow}
      disabled={isChecking || isUnavailable}
      className={cn("min-w-0", className)}
    >
      <Zap className="mr-2 size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
      <span className="truncate">{isChecking ? "Yönləndirilir" : t("buyNow")}</span>
    </Button>
  );
}
