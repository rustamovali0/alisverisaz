"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { ProductImage } from "@/lib/cart/types";
import { cn } from "@/lib/utils";

type ProductDetailGalleryProps = {
  images: ProductImage[];
  fallbackImageUrl: string | null;
  productName: string;
};

export function ProductBackButton() {
  const router = useRouter();

  return (
    <Button type="button" variant="outline" onClick={() => router.back()}>
      <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
      Geri
    </Button>
  );
}

export function ProductDetailGallery({
  images,
  fallbackImageUrl,
  productName,
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

  const goToPrevious = useCallback(() => {
    if (!hasMultipleImages) {
      return;
    }

    setActiveIndex((index) =>
      index === 0 ? galleryImages.length - 1 : index - 1,
    );
  }, [galleryImages.length, hasMultipleImages]);

  const goToNext = useCallback(() => {
    if (!hasMultipleImages) {
      return;
    }

    setActiveIndex((index) =>
      index === galleryImages.length - 1 ? 0 : index + 1,
    );
  }, [galleryImages.length, hasMultipleImages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }

      if (event.key === "ArrowLeft") {
        goToPrevious();
      }

      if (event.key === "ArrowRight") {
        goToNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
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
      <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
        <button
          type="button"
          disabled={!activeImage}
          onClick={() => activeImage && setIsOpen(true)}
          className="group relative block aspect-square w-full max-h-[72vh] bg-muted text-left"
          aria-label="Şəkli böyüt"
        >
          {activeImage ? (
            <img
              src={activeImage.url}
              alt={productName}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              Şəkil yoxdur
            </div>
          )}
          {activeImage ? (
            <span className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-sm">
              <Maximize2 className="size-5" aria-hidden="true" />
            </span>
          ) : null}
        </button>
        {hasMultipleImages ? (
          <div className="grid grid-cols-4 gap-2 border-t bg-background p-3 sm:grid-cols-5">
            {galleryImages.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "aspect-square overflow-hidden rounded-md border bg-muted",
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
          className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} şəkli`}
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-lg border bg-card"
            onClick={() => setIsOpen(false)}
            aria-label="Bağla"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
          {hasMultipleImages ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-lg border bg-card/95 shadow-lg md:inline-flex"
                onClick={(event) => {
                  event.stopPropagation();
                  goToPrevious();
                }}
                aria-label="Əvvəlki şəkil"
              >
                <ChevronLeft className="size-7" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-lg border bg-card/95 shadow-lg md:inline-flex"
                onClick={(event) => {
                  event.stopPropagation();
                  goToNext();
                }}
                aria-label="Növbəti şəkil"
              >
                <ChevronRight className="size-7" aria-hidden="true" />
              </button>
            </>
          ) : null}
          <div
            className="flex max-h-[86vh] max-w-[94vw] touch-pan-y flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            <img
              src={activeImage.url}
              alt={productName}
              className="max-h-[80vh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
            />
            {hasMultipleImages ? (
              <div className="flex items-center justify-center gap-2 md:hidden">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image.url}-${index}-dot`}
                    type="button"
                    className={cn(
                      "size-2.5 rounded-full transition",
                      index === activeIndex ? "bg-primary" : "bg-muted-foreground/35",
                    )}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`${index + 1}. şəkil`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
