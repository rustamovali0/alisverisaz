"use client";

import { MessageCircle } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { WhatsAppIcon } from "@/components/icons/social-icons";
import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { createCheckoutOrdersAction } from "@/lib/cart/actions";
import type { CartProduct } from "@/lib/cart/types";
import type { AuthRole } from "@/lib/auth/types";
import {
  findMatchingProductVariant,
  formatProductVariantSelection,
  getProductVariantKey,
  getProductVariantUnitPrice,
  normalizeProductVariantSelection,
} from "@/lib/products/variant-utils";
import { cn } from "@/lib/utils";

type WhatsAppOrderButtonProps = {
  product: CartProduct;
  sellerPhone: string;
  sellerName: string;
  viewerRole?: AuthRole | null;
  buyerName?: string;
  buyerPhone?: string;
  selectedOptions?: Record<string, string>;
  selectionReady?: boolean;
  className?: string;
  disabled?: boolean;
};

function toWhatsAppPhone(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 9) {
    digits = `994${digits}`;
  }

  if (digits.startsWith("994") && digits.length >= 12) {
    return digits;
  }

  return digits.length >= 10 ? digits : "";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

function getOrderNumber(result: Awaited<ReturnType<typeof createCheckoutOrdersAction>>) {
  if (!result.ok) {
    return "";
  }

  const order = result.orders?.[0];

  return typeof order?.orderNumber === "string" ? order.orderNumber : "";
}

export function WhatsAppOrderButton({
  product,
  sellerPhone,
  sellerName,
  viewerRole,
  buyerName = "",
  buyerPhone = "",
  selectedOptions,
  selectionReady = true,
  className,
  disabled = false,
}: WhatsAppOrderButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [checkoutRequestId, setCheckoutRequestId] = useState(() => crypto.randomUUID());
  const isSubmittingRef = useRef(false);
  const quantity = 1;
  const normalizedSelection = normalizeProductVariantSelection(selectedOptions);
  const selectedVariant = findMatchingProductVariant(
    product.variantCombinations ?? [],
    normalizedSelection,
  );
  const unitPrice = getProductVariantUnitPrice({
    priceAmount: product.priceAmount,
    discountAmount: product.discountAmount,
    variants: product.variantCombinations,
    selection: normalizedSelection,
  });
  const total = unitPrice * quantity;
  const whatsappPhone = toWhatsAppPhone(sellerPhone);
  const stockLimit = selectedVariant?.stockQuantity ?? product.stockQuantity;
  const isOutOfStock = disabled || stockLimit <= 0;
  const variantLabels = formatProductVariantSelection(
    product.options,
    normalizedSelection,
  );

  function buildMessage(orderNumber: string) {
    const lines = [
      "Salam. Alisveris.az yeni sifaris.",
      orderNumber ? `Sifariş: ${orderNumber}` : "",
      `Məhsul: ${product.name}`,
      ...variantLabels,
      `Say: ${quantity}`,
      `Qiymət: ${formatMoney(unitPrice)}`,
      `Cəmi: ${formatMoney(total)}`,
      `Mağaza: ${sellerName}`,
      buyerName ? `Alıcı: ${buyerName}` : "",
      buyerPhone ? `Alıcı nömrəsi: ${buyerPhone}` : "",
      typeof window !== "undefined" ? `Link: ${window.location.href}` : "",
    ].filter(Boolean);

    return lines.join("\n");
  }

  function handleClick() {
    if (isSubmittingRef.current) {
      return;
    }

    if (isOutOfStock) {
      void appAlert.error("Məhsul stokda yoxdur.", "WhatsApp sifarişi alınmadı");
      return;
    }

    if (!whatsappPhone) {
      void appAlert.error(
        "Satıcının WhatsApp nömrəsi düzgün təyin edilməyib.",
        "WhatsApp sifarişi alınmadı",
      );
      return;
    }

    if (!selectionReady) {
      void appAlert.error(
        "WhatsApp sifarişi üçün məhsul seçimlərini tamamlayın.",
        "Variant seçin",
      );
      return;
    }

    if (viewerRole && viewerRole !== "customer" && viewerRole !== "seller") {
      void appAlert.error("Sifariş üçün istifadəçi hesabı lazımdır.", "Sifariş alınmadı");
      return;
    }

    if (!buyerName.trim() || !buyerPhone.trim()) {
      void appAlert.error(
        "WhatsApp sifarişi üçün profilinizdə ad və telefon nömrəsi olmalıdır.",
        "Profil məlumatları çatışmır",
      );
      return;
    }

    isSubmittingRef.current = true;

    const popup = window.open("about:blank", "_blank");

    if (popup) {
      popup.opener = null;
    }
    const requestId = checkoutRequestId || crypto.randomUUID();
    const note = [
      "WhatsApp sifarişi",
      `Məhsul: ${product.name}`,
      ...variantLabels,
      `Say: ${quantity}`,
      `Qiymət: ${formatMoney(unitPrice)}`,
    ].join(" · ");
    const formData = new FormData();

    formData.set(
      "items",
      JSON.stringify([
        {
          productId: product.id,
          quantity,
          selectedOptions: normalizedSelection,
          variantKey: getProductVariantKey(product.id, normalizedSelection),
        },
      ]),
    );
    formData.set("checkoutRequestId", requestId);
    formData.set("fullName", buyerName.trim());
    formData.set("phone", buyerPhone.trim());
    formData.set("deliveryMethod", "pickup");
    formData.set("deliveryRegion", "");
    formData.set("address", "");
    formData.set("note", note);

    startTransition(async () => {
      try {
        const result = await createCheckoutOrdersAction(formData);

        if (!result.ok) {
          popup?.close();
          isSubmittingRef.current = false;
          void appAlert.error(result.message, "WhatsApp sifarişi alınmadı");
          return;
        }

        const message = buildMessage(getOrderNumber(result));
        const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

        setCheckoutRequestId(crypto.randomUUID());
        isSubmittingRef.current = false;
        void appAlert.success("Sifariş yaradıldı", "Satıcıya WhatsApp mesajı açılır.");

        if (popup) {
          popup.location.href = url;
        } else {
          window.location.href = url;
        }
      } catch {
        popup?.close();
        isSubmittingRef.current = false;
        void appAlert.error("Sifariş hazırda yaradıla bilmədi.", "WhatsApp sifarişi alınmadı");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isOutOfStock || isPending}
      className={cn("min-w-0 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800", className)}
    >
      <WhatsAppIcon className="mr-2 size-5 shrink-0" />
      <span className="truncate">
        {isPending ? "Sifariş yaradılır" : "WhatsApp ilə sifariş et"}
      </span>
      <MessageCircle className="ml-2 hidden size-4 shrink-0 sm:block" aria-hidden="true" />
    </Button>
  );
}
