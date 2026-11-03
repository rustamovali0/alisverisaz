"use client";

import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { OptimizedImage } from "@/components/common/optimized-image";
import { AddToCartButton } from "@/components/cart/cart-buttons";
import type { AuthRole } from "@/lib/auth/types";
import { getRequiredSelectableProductOptions } from "@/lib/products/variant-utils";
import type { CartProduct, ProductImage } from "@/lib/cart/types";

export function ProductDetailGallery({ images, fallbackImageUrl, product, viewerRole, isolatedStoreSlug }: {
  images: ProductImage[];
  fallbackImageUrl: string | null;
  product: CartProduct;
  viewerRole: AuthRole | null;
  isolatedStoreSlug?: string;
}) {
  const productName = product.name;
  const photos = [...new Set([
    ...images.filter((image) => image.isPrimary).map((image) => image.url),
    ...images.map((image) => image.url),
    fallbackImageUrl,
  ].filter((url): url is string => Boolean(url)))];
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnails = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef(-Infinity);
  const source = photos[index];
  const usable = source && !failed.includes(source);
  const multiple = photos.length > 1;

  function select(next: number) {
    const bounded = Math.max(0, Math.min(next, photos.length - 1));
    setIndex(bounded);
    const rail = thumbnails.current;
    const item = rail?.children[bounded] as HTMLElement | undefined;
    if (rail && item) {
      if (item.offsetLeft < rail.scrollLeft) rail.scrollLeft = item.offsetLeft;
      else if (item.offsetLeft + item.offsetWidth > rail.scrollLeft + rail.clientWidth)
        rail.scrollLeft = item.offsetLeft + item.offsetWidth - rail.clientWidth;
    }
  }

  function onKeys(event: KeyboardEvent) {
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (step && multiple) {
      event.preventDefault();
      select(index + step);
    }
  }

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    start.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const origin = start.current;
    start.current = null;
    const touch = event.changedTouches[0];
    if (!origin || !touch || !multiple) return;
    const dx = touch.clientX - origin.x;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(touch.clientY - origin.y)) {
      swipedAt.current = performance.now();
      select(index + (dx < 0 ? 1 : -1));
    }
  }

  const controls = multiple && (
    <>
      <button type="button" className="pdp-photo-arrow pdp-photo-prev" disabled={index === 0}
        onClick={() => select(index - 1)} aria-label="Əvvəlki şəkil"><ChevronLeft aria-hidden /></button>
      <button type="button" className="pdp-photo-arrow pdp-photo-next" disabled={index === photos.length - 1}
        onClick={() => select(index + 1)} aria-label="Növbəti şəkil"><ChevronRight aria-hidden /></button>
    </>
  );
  const placeholder = <span className="pdp-no-photo"><ImageOff aria-hidden /> Şəkil mövcud deyil</span>;

  return (
    <section className="pdp-gallery" aria-label="Məhsul şəkilləri" onKeyDown={onKeys}>
      <div className="pdp-photo-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {usable ? (
          <button type="button" className="pdp-photo-trigger" aria-label="Şəkli böyüt"
            onClick={() => {
              if (performance.now() - swipedAt.current < 350) return;
              dialog.current?.showModal();
              setViewerOpen(true);
            }}>
            <OptimizedImage key={source} src={source} alt={productName} fill
              sizes="(min-width: 1600px) 860px, (min-width: 1024px) 53vw, 94vw"
              loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"}
              onLoad={() => setLoaded((current) => current.includes(source) ? current : [...current, source])}
              onError={() => setFailed((current) => [...current, source])} />
            <span className="pdp-photo-zoom"><Maximize2 size={18} aria-hidden /></span>
          </button>
        ) : placeholder}
        {usable && !loaded.includes(source) && <span className="pdp-photo-skeleton" aria-hidden />}
        {controls}
        {photos.length > 0 && <span className="pdp-photo-count" aria-live="polite">{index + 1} / {photos.length}</span>}
      </div>
      {multiple && (
        <div ref={thumbnails} className="pdp-thumbnails" aria-label="Kiçik şəkillər">
          {photos.map((photo, i) => (
            <button key={photo} type="button" aria-label={`${i + 1}-ci şəkil`}
              aria-pressed={i === index} onClick={() => select(i)}>
              {failed.includes(photo) ? <ImageOff aria-hidden /> :
                <OptimizedImage src={photo} alt="" fill sizes="72px"
                  onError={() => setFailed((current) => [...current, photo])} />}
            </button>
          ))}
        </div>
      )}
      <dialog ref={dialog} className="pdp-lightbox" aria-label="Böyüdülmüş məhsul şəkli"
        onClose={() => setViewerOpen(false)} onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}>
        <div className="pdp-lightbox-head">
          <span>{productName} · {index + 1} / {photos.length}</span>
          {viewerOpen && viewerRole !== "seller" && product.stockQuantity > 0 &&
            getRequiredSelectableProductOptions(product.options ?? []).length === 0 && (
              <AddToCartButton product={product} viewerRole={viewerRole} isolatedStoreSlug={isolatedStoreSlug}
                className="!min-w-[130px] !w-[150px] !rounded-lg !bg-primary !text-primary-foreground" />
            )}
          <button type="button" className="pdp-lightbox-close" aria-label="Bağla" autoFocus onClick={() => dialog.current?.close()}><X aria-hidden /></button>
        </div>
        <div className="pdp-lightbox-photo" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {viewerOpen && usable ? <OptimizedImage src={source} alt={productName} fill sizes="100vw"
            onError={() => setFailed((current) => [...current, source])} /> : placeholder}
          {controls}
        </div>
      </dialog>
    </section>
  );
}
