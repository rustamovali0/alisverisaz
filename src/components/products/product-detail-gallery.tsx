"use client";

import { ArrowLeft, Maximize2, X } from "lucide-react";
import { useMemo, useState } from "react";

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
  const activeImage = galleryImages[activeIndex];

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-card">
        <button
          type="button"
          disabled={!activeImage}
          onClick={() => activeImage && setIsOpen(true)}
          className="group relative block aspect-square w-full bg-muted text-left"
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
        {galleryImages.length > 1 ? (
          <div className="grid grid-cols-5 gap-2 border-t bg-background p-3">
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-lg border bg-card"
            onClick={() => setIsOpen(false)}
            aria-label="Bağla"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
          <img
            src={activeImage.url}
            alt={productName}
            className="max-h-[86vh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </>
  );
}
