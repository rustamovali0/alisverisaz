"use client";

import { useRef, useState, useTransition } from "react";

import { WhatsAppIcon } from "@/components/icons/social-icons";
import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { createWhatsAppOrderIntentAction } from "@/lib/cart/actions";
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
  return `${new Intl.NumberFormat("az-AZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ₼`;
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

  function buildMessage() {
    const isRental = product.commerceType === "rental";
    const orderDate = new Intl.DateTimeFormat("az-AZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    const productUrl = typeof window !== "undefined"
      ? window.location.href.split("#")[0]
      : "";
    const formattedVariants = variantLabels.map((label) => `• ${label}`);
    const lines = [
      "*Alisveris.az — Yeni sifariş*",
      "",
      "Salam! Mağazanıza yeni sifariş sorğusu göndərildi.",
      "",
      "*Sifariş məlumatları*",
      `• Tarix: ${orderDate}`,
      `• Elan növü: ${isRental ? "İcarə" : "Satış"}`,
      "",
      "*Məhsul məlumatları*",
      `• Məhsul: ${product.name}`,
      ...formattedVariants,
      `• Say: ${quantity}`,
      `• ${isRental ? "İcarə qiyməti" : "Vahid qiymət"}: ${formatMoney(unitPrice)}`,
      product.discountAmount > 0 ? `• Endirim: ${formatMoney(product.discountAmount)}` : null,
      `• Ümumi məbləğ: *${formatMoney(total)}*`,
      product.depositEnabled && product.depositAmount > 0
        ? `• Depozit: ${formatMoney(product.depositAmount)}`
        : null,
      "",
      "*Alıcı məlumatları*",
      `• Ad: ${buyerName.trim() || "Qeyd edilməyib"}`,
      `• Telefon: ${buyerPhone.trim() || "Qeyd edilməyib"}`,
      "",
      "*Mağaza*",
      `• ${sellerName}`,
      "",
      productUrl ? `*Məhsula bax:* ${productUrl}` : null,
      "",
      "Zəhmət olmasa sifarişi təsdiqləmək üçün alıcı ilə əlaqə saxlayın.",
    ].filter((line): line is string => line !== null);

    return lines.join("\n");
  }

  function getWhatsAppUrl() {
    const message = buildMessage();

    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
  }

  function openWhatsApp(popup?: Window | null) {
    const url = getWhatsAppUrl();

    if (popup) {
      popup.location.href = url;
      return;
    }

    const opened = window.open(url, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = url;
    }
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

    isSubmittingRef.current = true;
    const popup = window.open("about:blank", "_blank");
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
    formData.set("checkoutFlow", "direct_whatsapp_button");

    startTransition(async () => {
      try {
        const result = await createWhatsAppOrderIntentAction(formData);

        if (!result.ok) {
          isSubmittingRef.current = false;
          openWhatsApp(popup);
          return;
        }

        setCheckoutRequestId(crypto.randomUUID());
        isSubmittingRef.current = false;
        openWhatsApp(popup);
      } catch {
        isSubmittingRef.current = false;
        openWhatsApp(popup);
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
    </Button>
  );
}
