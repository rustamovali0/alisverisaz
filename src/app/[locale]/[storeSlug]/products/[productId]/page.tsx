import { Clock3, ExternalLink, MapPin, MessageCircle, Package, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { ViewTracker } from "@/components/analytics/view-tracker";
import { AddToCartButton, BuyNowButton } from "@/components/cart/cart-buttons";
import { WhatsAppOrderButton } from "@/components/cart/whatsapp-order-button";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { ProductMessageForm } from "@/components/messages/product-message-form";
import {
  ProductMessageThread,
  ProductReviewList,
} from "@/components/products/product-feedback-lists";
import { ProductLocationSection } from "@/components/products/product-location-section";
import {
  ProductBackButton,
  ProductDetailGallery,
} from "@/components/products/product-detail-gallery";
import { ProductDetailScrollReset } from "@/components/products/product-detail-scroll-reset";
import { ProductReviewForm } from "@/components/reviews/product-review-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { trackActivityEvent } from "@/lib/activity/events";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMarketplaceProductById } from "@/lib/cart/data";
import { getSiteSettings } from "@/lib/cms/data";
import { formatAznDiscountedPrice } from "@/lib/format";
import {
  getLocationsForStores,
  getPublicProductLocations,
} from "@/lib/locations/data";
import type { ProductLocationAvailability } from "@/lib/locations/types";
import { getProductMessagesForProduct } from "@/lib/messages/data";
import {
  getProductReviews,
  getReviewSummary,
  hasUserPurchasedProduct,
} from "@/lib/reviews/data";
import { setRequestLocale } from "next-intl/server";

type ProductDetailPageProps = {
  params: Promise<{
    locale: string;
    storeSlug: string;
    productId: string;
  }>;
};

function getLocationMapUrl(location: ProductLocationAvailability["location"]) {
  if (location.mapLink) {
    return location.mapLink;
  }

  if (location.latitude !== null && location.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }

  const query = [location.city, location.district, location.address]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatShortLocation(location: ProductLocationAvailability["location"] | null) {
  if (!location) {
    return null;
  }

  return [location.city, location.district, location.address].filter(Boolean).join(", ");
}

function formatLastActive(value?: string | null) {
  if (!value) {
    return "Son aktiv: bu yaxınlarda";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Son aktiv: bu yaxınlarda";
  }

  return `Son aktiv: ${new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
  }).format(date)}`;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { locale, storeSlug, productId } = await params;
  const detail = await getMarketplaceProductById({
    productId,
    locale,
    storeSlug,
  });

  if (!detail) {
    return {};
  }

  return {
    title: `${detail.product.name} | ${detail.store.name}`,
    description: detail.product.description || `${detail.product.name} məhsul detalları.`,
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { locale, storeSlug, productId } = await params;
  setRequestLocale(locale);
  const [detail, siteSettings, current] = await Promise.all([
    getMarketplaceProductById({
      productId,
      locale,
      storeSlug,
    }),
    getSiteSettings(),
    getCurrentUserProfile(),
  ]);

  if (!detail || detail.store.slug !== storeSlug) {
    notFound();
  }

  const [messages, reviews, productLocations, storeLocations, hasPurchasedProduct] =
    await Promise.all([
    getProductMessagesForProduct(detail.product.id),
    getProductReviews(detail.product.id),
    getPublicProductLocations(detail.product.id),
    getLocationsForStores([detail.store.id]),
    current?.role === "customer"
      ? hasUserPurchasedProduct({
          userId: current.user.id,
          productId: detail.product.id,
        })
      : Promise.resolve(false),
  ]);

  after(() => {
    void trackActivityEvent({
      eventType: "product_view",
      storeId: detail.store.id,
      productId: detail.product.id,
      metadata: {
        title: "Məhsul açıldı",
        description: `${detail.product.name} · ${detail.store.name}`,
        product_name: detail.product.name,
        store_name: detail.store.name,
      },
    });
  });

  const reviewSummary = getReviewSummary(reviews);
  const canBuy = detail.product.stockQuantity > 0;
  const viewerRole = current?.role ?? null;
  const canWriteReview = current?.role === "customer" && hasPurchasedProduct;
  const currentReview =
    current?.user.id ? reviews.find((review) => review.userId === current.user.id) ?? null : null;
  const visibleProductLocations: ProductLocationAvailability[] =
    productLocations.length > 0
      ? productLocations
      : storeLocations
          .filter((location) => location.isActive)
          .map((location) => ({
            id: `store-location-${location.id}`,
            productId: detail.product.id,
            locationId: location.id,
            stockQuantity: detail.product.stockQuantity,
            isAvailable: canBuy,
            location,
          }));
  const sellerLocation =
    visibleProductLocations.find((item) => item.location.showAddress)?.location ??
    visibleProductLocations[0]?.location ??
    null;
  const sellerAddress = formatShortLocation(sellerLocation) ?? detail.store.address;
  const sellerPhone = sellerLocation?.phone ?? detail.store.phone ?? "";
  const sellerMapUrl = sellerLocation
    ? getLocationMapUrl(sellerLocation)
    : sellerAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sellerAddress)}`
      : null;

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <ProductDetailScrollReset />
      <ViewTracker productId={detail.product.id} />
      <div className="container max-w-full py-5 md:py-8">
        <nav className="mb-5 min-w-0 text-sm text-muted-foreground">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <ProductBackButton />
            <div className="flex min-w-0 items-center overflow-hidden">
              <Link href="/products" className="hover:text-primary">
                Mağazalar
              </Link>
              <span className="mx-2">·</span>
              <Link href={`/${detail.store.slug}`} className="min-w-0 truncate hover:text-primary">
                {detail.store.name}
              </Link>
              <span className="mx-2">·</span>
              <span className="min-w-0 truncate font-medium text-foreground">
                {detail.product.name}
              </span>
            </div>
          </div>
        </nav>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <ProductDetailGallery
            images={detail.product.images}
            fallbackImageUrl={detail.product.imageUrl}
            productName={detail.product.name}
          />
          <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm md:p-5">
            <p className="truncate text-sm text-muted-foreground">{detail.store.name}</p>
            <div className="mt-2 flex min-w-0 items-start justify-between gap-3">
              <h1 className="min-w-0 break-words text-2xl font-black tracking-normal md:text-3xl">
                {detail.product.name}
              </h1>
              <FavoriteToggleButton
                productId={detail.product.id}
                productName={detail.product.name}
                className="shrink-0"
              />
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
              {reviewSummary.count ? (
                <>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={
                          value <= Math.round(reviewSummary.average)
                            ? "size-5 fill-amber-400 text-amber-400"
                            : "size-5 text-muted-foreground"
                        }
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {reviewSummary.average} / 5 ({reviewSummary.count} rəy)
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Hələ rəy yoxdur</span>
              )}
            </div>
            <p className="mt-5 break-words text-3xl font-black">
              {formatAznDiscountedPrice(
                detail.product.priceAmount,
                detail.product.discountAmount,
              )}
            </p>
            <p className={canBuy ? "mt-2 text-sm text-muted-foreground" : "mt-2 text-sm font-semibold text-destructive"}>
              {canBuy ? `Stok: ${detail.product.stockQuantity}` : "Stokda yoxdur"}
            </p>
            {detail.product.description ? (
              <p className="mt-5 break-words leading-7 text-muted-foreground">
                {detail.product.description}
              </p>
            ) : null}
            <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
              <BuyNowButton
                product={detail.product}
                viewerRole={viewerRole}
                disabled={!canBuy}
                className="w-full"
              />
              <AddToCartButton
                product={detail.product}
                viewerRole={viewerRole}
                disabled={!canBuy}
                className="w-full"
              />
            </div>
            {siteSettings.showWhatsappOrderButton && sellerPhone ? (
              <WhatsAppOrderButton
                product={detail.product}
                sellerPhone={sellerPhone}
                sellerName={detail.store.name}
                viewerRole={viewerRole}
                buyerName={current?.profile?.full_name ?? current?.user.email ?? ""}
                buyerPhone={current?.profile?.phone ?? ""}
                disabled={!canBuy}
                className="mt-3 h-12 w-full"
              />
            ) : null}
            <div className="mt-5 min-w-0 rounded-lg border bg-background p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                  {detail.store.logoUrl ? (
                    <img
                      src={detail.store.logoUrl}
                      alt={detail.store.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-black text-muted-foreground">
                      {detail.store.name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Satıcı</p>
                  <h2 className="truncate text-base font-black leading-5 tracking-normal">
                    {detail.store.name}
                  </h2>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Package className="size-3.5" aria-hidden="true" />
                      {detail.store.productCount} məhsul
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{formatLastActive(detail.store.updatedAt)}</span>
                    </span>
                  </div>
                </div>
              </div>
              {sellerAddress ? (
                <p className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{sellerAddress}</span>
                </p>
              ) : null}
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href={`/${detail.store.slug}`}>Mağazaya keç</Link>
              </Button>
              {sellerMapUrl ? (
                <Button asChild variant="secondary" className="mt-2 w-full">
                  <a href={sellerMapUrl} target="_blank" rel="noreferrer">
                    Xəritədə göstər
                    <ExternalLink className="ml-2 size-4" aria-hidden="true" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-5 md:mt-6">
          <ProductLocationSection locations={visibleProductLocations} />
        </div>

        <section className="mt-5 grid min-w-0 gap-4 md:mt-6 md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm md:p-5">
            <div className="mb-3 flex items-center gap-2 md:mb-4">
              <MessageCircle className="size-4 text-primary md:size-5" aria-hidden="true" />
              <h2 className="text-lg font-black tracking-normal md:text-xl">
                Məhsul haqqında suallar
              </h2>
            </div>
            <ProductMessageForm
              productId={detail.product.id}
              storeId={detail.store.id}
              storeSlug={detail.store.slug}
              viewerRole={viewerRole}
              defaultSenderName={current?.profile?.full_name ?? current?.user.email ?? ""}
              defaultSenderPhone={current?.profile?.phone ?? ""}
            />
            <ProductMessageThread messages={messages} />
          </div>

          <div className="min-w-0 rounded-lg border bg-card p-3 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <h2 className="text-xl font-black tracking-normal">Məhsul dəyərləndirməsi</h2>
            </div>
            {canWriteReview ? (
              <ProductReviewForm
                productId={detail.product.id}
                storeSlug={detail.store.slug}
                viewerRole={viewerRole}
                reviewId={currentReview?.id ?? null}
                initialRating={currentReview?.rating ?? 0}
                initialComment={currentReview?.comment ?? ""}
              />
            ) : null}
            <ProductReviewList reviews={reviews} />
          </div>
        </section>
      </div>
      <SiteFooter
        siteName={siteSettings.shortName || siteSettings.siteName}
        description={siteSettings.defaultMetaDescription}
        socialLinks={{
          instagram: siteSettings.socialLinks.instagram,
          tiktok: siteSettings.socialLinks.tiktok,
          whatsapp: siteSettings.socialLinks.whatsapp || siteSettings.whatsapp,
        }}
      />
    </main>
  );
}
