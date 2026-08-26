"use client";

import { useMemo, useState } from "react";

import { AddToCartButton, BuyNowButton } from "@/components/cart/cart-buttons";
import { WhatsAppOrderButton } from "@/components/cart/whatsapp-order-button";
import type { AuthRole } from "@/lib/auth/types";
import type { CartProduct } from "@/lib/cart/types";
import {
  findMatchingProductVariant,
  getAutoProductVariantSelection,
  getEnabledProductOptions,
  getProductVariantUnitPrice,
  normalizeProductVariantSelection,
} from "@/lib/products/variant-utils";
import { formatAznPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductPurchaseOptionsProps = {
  product: CartProduct;
  viewerRole?: AuthRole | null;
  showWhatsappOrderButton?: boolean;
  sellerPhone?: string;
  sellerName: string;
  buyerName?: string;
  buyerPhone?: string;
  disabled?: boolean;
};

function isSelectionReady(product: CartProduct, selection: Record<string, string>) {
  return getEnabledProductOptions(product.options ?? []).every((option) => {
    if (option.values.length <= 1) {
      return true;
    }

    return Boolean(selection[option.type]);
  });
}

function optionValueWouldBeAvailable(input: {
  product: CartProduct;
  currentSelection: Record<string, string>;
  optionType: string;
  value: string;
}) {
  const variants = input.product.variantCombinations ?? [];

  if (variants.length === 0) {
    return input.product.stockQuantity > 0;
  }

  const nextSelection = {
    ...input.currentSelection,
    [input.optionType]: input.value,
  };
  const enabledTypes = getEnabledProductOptions(input.product.options ?? []).map(
    (option) => option.type,
  );

  return variants.some((variant) => {
    if (variant.isEnabled === false || variant.stockQuantity <= 0) {
      return false;
    }

    return Object.entries(nextSelection).every(
      ([type, selectedValue]) => variant.combination[type] === selectedValue,
    ) && enabledTypes.every((type) => nextSelection[type] || variant.combination[type]);
  });
}

export function ProductPurchaseOptions({
  product,
  viewerRole,
  showWhatsappOrderButton = false,
  sellerPhone = "",
  sellerName,
  buyerName = "",
  buyerPhone = "",
  disabled = false,
}: ProductPurchaseOptionsProps) {
  const initialSelection = useMemo(
    () => getAutoProductVariantSelection(product.options ?? []),
    [product.options],
  );
  const [selection, setSelection] = useState(initialSelection);
  const normalizedSelection = normalizeProductVariantSelection(selection);
  const visibleOptions = getEnabledProductOptions(product.options ?? []).filter(
    (option) => option.values.length > 1,
  );
  const selectedVariant = findMatchingProductVariant(
    product.variantCombinations ?? [],
    normalizedSelection,
  );
  const stockLimit = selectedVariant?.stockQuantity ?? product.stockQuantity;
  const selectionReady = isSelectionReady(product, normalizedSelection);
  const unitPrice = getProductVariantUnitPrice({
    priceAmount: product.priceAmount,
    discountAmount: product.discountAmount,
    variants: product.variantCombinations,
    selection: normalizedSelection,
  });
  const isUnavailable = disabled || stockLimit <= 0;

  return (
    <div className="mt-5 grid min-w-0 gap-4">
      {visibleOptions.length > 0 ? (
        <div className="grid gap-2.5 rounded-lg border border-primary/15 bg-primary/[0.035] p-3 shadow-sm dark:bg-primary/10">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="text-[13px] font-black">Seçimlər</p>
            <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              Məhsul variantı
            </span>
          </div>
          {visibleOptions.map((option) => (
            <div key={option.type} className="grid gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {option.name}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {option.values.map((value) => {
                  const isSelected = normalizedSelection[option.type] === value.value;
                  const isAvailable = optionValueWouldBeAvailable({
                    product,
                    currentSelection: normalizedSelection,
                    optionType: option.type,
                    value: value.value,
                  });

                  return (
                    <button
                      key={value.value}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() =>
                        setSelection((current) => ({
                          ...current,
                          [option.type]: value.value,
                        }))
                      }
                      className={cn(
                        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold shadow-sm transition",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary/15 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
                        !isAvailable && "cursor-not-allowed opacity-40",
                      )}
                    >
                      {option.type === "color" ? (
                        <span
                          className="size-3.5 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: value.colorHex ?? "#e5e7eb" }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="min-w-0 max-w-[9rem] truncate">{value.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {unitPrice !== Math.max(product.priceAmount - product.discountAmount, 0) ? (
            <p className="text-xs font-semibold text-primary">
              Seçilmiş qiymət: {formatAznPrice(unitPrice)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <BuyNowButton
          product={product}
          viewerRole={viewerRole}
          selectedOptions={normalizedSelection}
          selectionReady={selectionReady}
          disabled={isUnavailable}
          className="h-12 w-full rounded-xl shadow-sm"
        />
        <AddToCartButton
          product={product}
          viewerRole={viewerRole}
          selectedOptions={normalizedSelection}
          selectionReady={selectionReady}
          disabled={isUnavailable}
          className="w-full border-primary/20 bg-background hover:bg-primary/5"
        />
      </div>
      {showWhatsappOrderButton && sellerPhone ? (
        <WhatsAppOrderButton
          product={product}
          sellerPhone={sellerPhone}
          sellerName={sellerName}
          viewerRole={viewerRole}
          buyerName={buyerName}
          buyerPhone={buyerPhone}
          selectedOptions={normalizedSelection}
          selectionReady={selectionReady}
          disabled={isUnavailable}
          className="h-12 w-full"
        />
      ) : null}
    </div>
  );
}
