"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AddToCartButton } from "@/components/cart/cart-buttons";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import type { CartProduct, ProductImage } from "@/lib/cart/types";
import { formatAznDiscountedPrice, formatAznPrice } from "@/lib/format";
import { getRequiredSelectableProductOptions } from "@/lib/products/variant-utils";
import { cn } from "@/lib/utils";

type ProductDetailGalleryProps = {
  images: ProductImage[];
  fallbackImageUrl: string | null;
  product: CartProduct;
  productName: string;
  viewerRole?: AuthRole | null;
};

export function ProductBackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.back()}
      className="hidden md:inline-flex"
    >
      <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
      Geri
    </Button>
  );
}

export function ProductDetailGallery({
  images,
  fallbackImageUrl,
  product,
  productName,
  viewerRole,
}: ProductDetailGalleryProps) {
  const galleryImages = useMemo(() => {
    if (images.length > 0) {
      return images;
    }

    return fallbackImageUrl
      ? [
          {
            url: fallbackImageUrl,
            isPrimary: true,
          },
        ]
      : [];
  }, [fallbackImageUrl, images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const activeImage = galleryImages[activeIndex];
  const hasMultipleImages = galleryImages.length > 1;
  const canGoPrevious = hasMultipleImages && activeIndex > 0;
  const canGoNext = hasMultipleImages && activeIndex < galleryImages.length - 1;
  const hasDiscount = product.discountAmount > 0;
  const currentPrice = formatAznDiscountedPrice(
    product.priceAmount,
    product.discountAmount,
  );
  const requiredOptions = getRequiredSelectableProductOptions(product.options ?? []);
  const cartSelectionReady = requiredOptions.length === 0;

  const goToPrevious = useCallback(() => {
    setActiveIndex((index) => Math.max(index - 1, 0));
  }, []);

  const goToNext = useCallback(() => {
    setActiveIndex((index) => Math.min(index + 1, galleryImages.length - 1));
  }, [galleryImages.length, hasMultipleImages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const previousTouchAction = document.body.style.touchAction;
    const previousOverscrollBehavior = document.documentElement.style.overscrollBehavior;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";
    document.documentElement.style.overscrollBehavior = "none";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      document.body.style.touchAction = previousTouchAction;
      document.documentElement.style.overscrollBehavior = previousOverscrollBehavior;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToNext, goToPrevious, isOpen]);

  function handleTouchEnd(clientX: number) {
    if (touchStartX === null) {
      return;
    }

    const delta = touchStartX - clientX;
    setTouchStartX(null);

    if (Math.abs(delta) < 40) {
      return;
    }

    if (delta > 0) {
      goToNext();
      return;
    }

    goToPrevious();
  }

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm">
        <button
          type="button"
          disabled={!activeImage}
          onClick={() => activeImage && setIsOpen(true)}
          className="group relative block aspect-[4/3] w-full bg-muted text-left md:aspect-[4/3] md:max-h-[420px] lg:max-h-[460px]"
          aria-label="Şəkli böyüt"
        >
          {activeImage ? (
            <img
              src={activeImage.url}
              alt={productName}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              Şəkil yoxdur
            </div>
          )}
        </button>
        {hasMultipleImages ? (
          <div className="flex gap-2 overflow-x-auto border-t bg-background p-2.5 sm:grid sm:grid-cols-5 sm:p-3">
            {galleryImages.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "size-14 shrink-0 overflow-hidden rounded-md border bg-muted sm:size-auto sm:aspect-square",
                  index === activeIndex ? "border-primary ring-2 ring-primary/20" : "",
                )}
                aria-label={`${index + 1}. şəkil`}
              >
                <img
                  src={image.url}
                  alt={`${productName} ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isOpen && activeImage ? (
        <div
          className="fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} şəkli`}
          onClick={() => setIsOpen(false)}
          onWheel={(event) => event.preventDefault()}
          onTouchMove={(event) => event.preventDefault()}
        >
          <div
            className="z-10 flex min-h-[76px] shrink-0 items-center gap-3 border-b bg-card/98 px-3 py-2 shadow-sm sm:min-h-[86px] sm:px-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="size-12 shrink-0 overflow-hidden rounded-md border bg-muted sm:size-14">
              <img
                src={activeImage.url}
                alt={productName}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-black leading-5 sm:text-base">
                {productName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-black text-foreground">{currentPrice}</p>
                {hasDiscount ? (
                  <p className="text-xs text-muted-foreground line-through">
                    {formatAznPrice(product.priceAmount)}
                  </p>
                ) : null}
              </div>
              <AddToCartButton
                product={product}
                viewerRole={viewerRole}
                selectionReady={cartSelectionReady}
                disabled={product.stockQuantity <= 0}
                className="!h-10 min-h-10 w-[124px] rounded-lg px-2 text-xs sm:w-[168px] sm:text-sm"
              />
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-11"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsOpen(false);
                }}
                aria-label="Bağla"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-3 sm:px-5 sm:py-5"
            onClick={() => setIsOpen(false)}
            onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            {canGoPrevious ? (
              <button
                type="button"
                className="absolute left-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border bg-card/95 text-foreground shadow-lg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-4 sm:size-12"
                onClick={(event) => {
                  event.stopPropagation();
                  goToPrevious();
                }}
                aria-label="Əvvəlki şəkil"
              >
                <ChevronLeft className="size-7" aria-hidden="true" />
              </button>
            ) : null}
            <img
              src={activeImage.url}
              alt={productName}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
              onClick={(event) => event.stopPropagation()}
            />
            {canGoNext ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border bg-card/95 text-foreground shadow-lg transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-4 sm:size-12"
                onClick={(event) => {
                  event.stopPropagation();
                  goToNext();
                }}
                aria-label="Növbəti şəkil"
              >
                <ChevronRight className="size-7" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
