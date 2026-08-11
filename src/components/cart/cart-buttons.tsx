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
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const isUnavailable = disabled || product.stockQuantity <= 0;

  useEffect(() => {
    setQuantity(getCartQuantity(product.id));

    function handleCartUpdate() {
      setQuantity(getCartQuantity(product.id));
    }

    window.addEventListener("alisveris-cart-updated", handleCartUpdate);

    return () => window.removeEventListener("alisveris-cart-updated", handleCartUpdate);
  }, [product.id]);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setHasUser(Boolean(data.user));
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasUser(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
    void supabase.auth.getUser().then(({ data }) => {
      const isSignedIn = Boolean(data.user);
      setHasUser(isSignedIn);
      emitCartToast(isSignedIn);
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
          "grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center overflow-hidden rounded-lg border bg-background text-foreground",
          className,
        )}
      >
        <button
          type="button"
          className="grid h-full min-h-10 place-items-center border-r transition hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleDecrease}
          aria-label="Səbətdəki sayı azalt"
        >
          <Minus className="size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
        </button>
        <span className="flex min-w-0 items-center justify-center gap-1 px-1 text-center text-[11px] font-black leading-tight sm:text-xs">
          <Check className="size-4 shrink-0 stroke-[2.5]" aria-hidden="true" />
          <span className="truncate">Səbətə əlavə edilib</span>
          <span className="shrink-0">({quantity})</span>
        </span>
        <button
          type="button"
          className="grid h-full min-h-10 place-items-center border-l transition hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45"
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
      className={cn("min-w-0", className)}
    >
      <ShoppingCart className="mr-2 size-5 shrink-0 stroke-[2.4]" aria-hidden="true" />
      <span className="truncate">{t("addToCart")}</span>
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
