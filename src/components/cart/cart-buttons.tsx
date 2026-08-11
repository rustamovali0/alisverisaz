"use client";

import { ShoppingCart, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import type { CartProduct } from "@/lib/cart/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const CART_KEY = "alisveris_cart";

function readCart() {
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
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("alisveris-cart-updated"));
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
  const isUnavailable = disabled || product.stockQuantity <= 0;

  function handleAdd() {
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

    const items = readCart();
    const existing = items.find((item) => item.productId === product.id);

    if (existing) {
      if (existing.quantity >= product.stockQuantity) {
        showToast({
          title: "Stok limiti keçilə bilməz.",
          description: "Səbətdəki say hazırkı stok miqdarına bərabərdir.",
          variant: "warning",
        });
        return;
      }

      existing.quantity = Math.min(existing.quantity + 1, product.stockQuantity);
    } else {
      items.push({
        productId: product.id,
        quantity: 1,
      });
    }

    writeCart(items);
    showToast({
      title: "Məhsul səbətə əlavə edildi",
      description: "Məhsul səbətinizdədir.",
      variant: "success",
    });
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
