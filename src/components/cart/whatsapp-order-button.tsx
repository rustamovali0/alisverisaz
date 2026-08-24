"use client";

import { MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { WhatsAppIcon } from "@/components/icons/social-icons";
import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { createCheckoutOrdersAction } from "@/lib/cart/actions";
import type { CartProduct } from "@/lib/cart/types";
import type { AuthRole } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

type WhatsAppOrderButtonProps = {
  product: CartProduct;
  sellerPhone: string;
  sellerName: string;
  viewerRole?: AuthRole | null;
  buyerName?: string;
  buyerPhone?: string;
  className?: string;
  disabled?: boolean;
};

function toWhatsAppPhone(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 9) {
    digits = `994${digits}`;
  }

  return digits.startsWith("994") && digits.length >= 12 ? digits : "";
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
  className,
  disabled = false,
}: WhatsAppOrderButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [checkoutRequestId, setCheckoutRequestId] = useState(() => crypto.randomUUID());
  const quantity = 1;
  const unitPrice = Math.max(product.priceAmount - product.discountAmount, 0);
  const total = unitPrice * quantity;
  const whatsappPhone = toWhatsAppPhone(sellerPhone);
  const isUnavailable = disabled || product.stockQuantity <= 0 || !whatsappPhone;

  function buildMessage(orderNumber: string) {
    const lines = [
      "Salam. Alisveris.az yeni sifaris.",
      orderNumber ? `Sifariş: ${orderNumber}` : "",
      `Məhsul: ${product.name}`,
      "Rəng: Seçilməyib",
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
    if (isUnavailable) {
      void appAlert.error(
        whatsappPhone
          ? "Məhsul stokda yoxdur."
          : "Satıcının WhatsApp nömrəsi təyin edilməyib.",
        "WhatsApp sifarişi alınmadı",
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

    const popup = window.open("about:blank", "_blank");

    if (popup) {
      popup.opener = null;
    }
    const requestId = checkoutRequestId || crypto.randomUUID();
    const note = [
      "WhatsApp sifarişi",
      `Məhsul: ${product.name}`,
      "Rəng: Seçilməyib",
      `Say: ${quantity}`,
      `Qiymət: ${formatMoney(unitPrice)}`,
    ].join(" · ");
    const formData = new FormData();

    formData.set("items", JSON.stringify([{ productId: product.id, quantity }]));
    formData.set("checkoutRequestId", requestId);
    formData.set("fullName", buyerName.trim());
    formData.set("phone", buyerPhone.trim());
    formData.set("deliveryMethod", "pickup");
    formData.set("deliveryRegion", "");
    formData.set("address", "");
    formData.set("note", note);

    startTransition(async () => {
      const result = await createCheckoutOrdersAction(formData);

      if (!result.ok) {
        popup?.close();
        void appAlert.error(result.message, "WhatsApp sifarişi alınmadı");
        return;
      }

      const message = buildMessage(getOrderNumber(result));
      const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

      setCheckoutRequestId(crypto.randomUUID());
      void appAlert.success("Sifariş yaradıldı", "Satıcıya WhatsApp mesajı açılır.");

      if (popup) {
        popup.location.href = url;
      } else {
        window.location.href = url;
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isUnavailable || isPending}
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
