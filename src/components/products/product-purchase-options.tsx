"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { ProductDetailPrice } from "./product-detail-price";

type ProductPurchaseOptionsProps = {
  product: CartProduct;
  viewerRole?: AuthRole | null;
  showWhatsappOrderButton?: boolean;
  sellerPhone?: string;
  sellerName: string;
  buyerName?: string;
  buyerPhone?: string;
  disabled?: boolean;
  isolatedStoreSlug?: string | null;
  isolatedStoreBaseHref?: string | null;
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
  isolatedStoreSlug,
  isolatedStoreBaseHref,
}: ProductPurchaseOptionsProps) {
  const initialSelection = useMemo(
    () => getAutoProductVariantSelection(product.options ?? []),
    [product.options],
  );
  const [selection, setSelection] = useState(initialSelection);
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const buyBar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = buyBar.current;
    const page = bar?.closest<HTMLElement>(".pdp");
    if (!bar || !page) return;

    const nav = document.querySelector(".mobile-bottom-nav-stable");
    const update = () => {
      page.style.setProperty("--pdp-nav-height", `${nav?.getBoundingClientRect().height ?? 0}px`);
      page.style.setProperty("--pdp-bar-height", `${bar.getBoundingClientRect().height}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    if (nav) observer.observe(nav);
    update();
    return () => observer.disconnect();
  }, []);

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

  const quantity = Math.max(1, Math.min(requestedQuantity, stockLimit));
  const purchaseProps = {
    product, viewerRole, selectedOptions: normalizedSelection,
    selectionReady, disabled: isUnavailable, isolatedStoreSlug,
  };

  return (
    <div id="pdp-purchase" className="pdp-purchase">
      <ProductDetailPrice product={product} unitPrice={unitPrice} stock={stockLimit}
        hasVariantPrice={selectedVariant?.priceOverrideAmount != null} />
      {visibleOptions.map((option) => (
        <fieldset key={option.type} className="pdp-option">
          <legend>{option.name}</legend>
          <div>
            {option.values.map((value) => {
              const selected = normalizedSelection[option.type] === value.value;
              const available = optionValueWouldBeAvailable({
                product, currentSelection: normalizedSelection, optionType: option.type, value: value.value,
              });
              return (
                <button key={value.value} type="button" aria-pressed={selected} disabled={!available}
                  onClick={() => {
                    setSelection((current) => ({ ...current, [option.type]: value.value }));
                    setRequestedQuantity(1);
                  }}>
                  {option.type === "color" && <i style={{ backgroundColor: value.colorHex ?? "#e5e7eb" }} aria-hidden />}
                  {value.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {viewerRole !== "seller" && (
        <>
          {!isUnavailable && selectionReady && (
            <div className="pdp-quantity">
              <span>Miqdar</span>
              <div role="group" aria-label="Miqdar">
                <button type="button" aria-label="Miqdarı azalt" disabled={quantity <= 1}
                  onClick={() => setRequestedQuantity(quantity - 1)}>−</button>
                <output aria-live="polite">{quantity}</output>
                <button type="button" aria-label="Miqdarı artır" disabled={quantity >= stockLimit}
                  onClick={() => setRequestedQuantity(quantity + 1)}>+</button>
              </div>
            </div>
          )}
          <div className="pdp-purchase-actions">
            <div className="pdp-buy-bar" ref={buyBar}>
              <span className="pdp-mobile-price">
                <small>{isUnavailable ? "Stokda yoxdur" : quantity > 1 ? `${quantity} ədəd` : "Qiymət"}</small>
                <strong>{formatAznPrice(unitPrice * quantity)}</strong>
              </span>
              {!selectionReady && !isUnavailable ? (
                <a href="#pdp-purchase" className="pdp-secondary-action pdp-select-options">Variant seçin</a>
              ) : (
                <AddToCartButton {...purchaseProps} initialAddQuantity={quantity}
                  className="pdp-add-cart !min-h-12 w-full !rounded-lg !border-0 !bg-primary !text-primary-foreground" />
              )}
            </div>
            <BuyNowButton {...purchaseProps} orderQuantity={quantity} isolatedStoreBaseHref={isolatedStoreBaseHref}
              className="pdp-buy-now !min-h-12 w-full !rounded-lg !border !border-primary/30 !bg-card !text-primary shadow-none" />
          </div>
          {showWhatsappOrderButton && (
            <WhatsAppOrderButton {...purchaseProps} sellerPhone={sellerPhone} sellerName={sellerName}
              buyerName={buyerName} buyerPhone={buyerPhone} orderQuantity={quantity}
              className="pdp-whatsapp !min-h-11 w-full !rounded-lg shadow-none" />
          )}
        </>
      )}
    </div>
  );
}
