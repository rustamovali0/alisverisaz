"use client";

import { ShoppingCart, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { CartProduct } from "@/lib/cart/types";
import { showToast } from "@/lib/toast";

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

export function AddToCartButton({ product }: { product: CartProduct }) {
  const t = useTranslations("marketplace");

  function handleAdd() {
    const items = readCart();
    const existing = items.find((item) => item.productId === product.id);

    if (existing) {
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
      description: "Sifarişi tamamlamaq üçün zəhmət olmasa giriş edin.",
      variant: "success",
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleAdd}>
      <ShoppingCart className="mr-2 size-4" aria-hidden="true" />
      {t("addToCart")}
    </Button>
  );
}

export function BuyNowButton({ product }: { product: CartProduct }) {
  const t = useTranslations("marketplace");
  const router = useRouter();

  function handleBuyNow() {
    writeCart([
      {
        productId: product.id,
        quantity: 1,
      },
    ]);
    router.push("/cart");
  }

  return (
    <Button type="button" onClick={handleBuyNow}>
      <Zap className="mr-2 size-4" aria-hidden="true" />
      {t("buyNow")}
    </Button>
  );
}
