import { Clock3, ExternalLink, MapPin, MessageCircle, Package, Pencil, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { ViewTracker } from "@/components/analytics/view-tracker";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  ProductReviewList,
} from "@/components/products/product-feedback-lists";
import { ProductPurchaseOptions } from "@/components/products/product-purchase-options";
import { RelatedProductList } from "@/components/products/related-product-list";
import {
  ProductBackButton,
  ProductDetailGallery,
} from "@/components/products/product-detail-gallery";
import { ProductDetailScrollReset } from "@/components/products/product-detail-scroll-reset";
import { ProductReviewForm } from "@/components/reviews/product-review-form";
import { ProductJsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { trackActivityEvent } from "@/lib/activity/events";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMarketplaceProductById, getSimilarMarketplaceProductPage } from "@/lib/cart/data";
import { getSiteSettings } from "@/lib/cms/data";
import { getStorePath, getStoreSubdomainSlug } from "@/lib/config/domains";
import { siteConfig } from "@/lib/config/site";
import { formatAznDiscountedPrice } from "@/lib/format";
import {
  getLocationsForStores,
  getPublicProductLocations,
} from "@/lib/locations/data";
import type { ProductLocationAvailability } from "@/lib/locations/types";
import {
  getProductReviews,
  getReviewSummary,
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

  const canonicalUrl = `${siteConfig.url}/store/${detail.store.slug}/products/${detail.product.slug}`;
  const description = detail.product.description || `${detail.product.name} məhsul detalları.`;

  return {
    title: `${detail.product.name} | ${detail.store.name}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${detail.product.name} | ${detail.store.name}`,
      description,
      url: canonicalUrl,
      images: detail.product.imageUrl ? [detail.product.imageUrl] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${detail.product.name} | ${detail.store.name}`,
      description,
      images: detail.product.imageUrl ? [detail.product.imageUrl] : undefined,
    },
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

  const [reviews, productLocations, storeLocations] =
    await Promise.all([
    getProductReviews(detail.product.id),
    getPublicProductLocations(detail.product.id),
    getLocationsForStores([detail.store.id]),
  ]);

  const relatedProducts = detail.product.categoryId
    ? await getSimilarMarketplaceProductPage(locale, {
        productId: detail.product.id,
        categoryId: detail.product.categoryId,
        limit: 4,
      })
    : null;

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

  const reviewSummary = getReviewSummary(reviews);
  const canBuy = detail.product.stockQuantity > 0;
  const viewerRole = current?.role ?? null;
  const isStoreOwner = current?.role === "seller" && current.user.id === detail.store.ownerId;
  const canWriteReview = !isStoreOwner && (current?.role === "customer" || current?.role === "seller");
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
  const sellerPhone = sellerLocation?.phone?.trim() || detail.store.phone?.trim() || "";
  const sellerMapUrl = sellerLocation
    ? getLocationMapUrl(sellerLocation)
    : sellerAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sellerAddress)}`
      : null;
  const requestHeaders = await headers();
  const storeSubdomainSlug = getStoreSubdomainSlug(requestHeaders.get("host"));
  const storeBaseHref = storeSubdomainSlug === detail.store.slug ? "/" : getStorePath(detail.store.slug);

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 px-0 py-4 pb-[calc(96px+env(safe-area-inset-bottom))] text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-4 sm:py-8 md:pb-8 lg:py-10">
      <ProductDetailScrollReset />
      <ProductJsonLd
        detail={detail}
        url={`${siteConfig.url}/store/${detail.store.slug}/products/${detail.product.slug}`}
      />
      <ViewTracker productId={detail.product.id} />
      <div className="mx-auto w-full max-w-[1280px] px-4 py-3 sm:px-6 md:py-6 lg:px-8">
        <nav className="mb-5 min-w-0 text-sm text-slate-500 dark:text-slate-400 md:mb-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <ProductBackButton />
            <div className="flex min-w-0 items-center overflow-hidden">
              <Link href="/products" className="hover:text-blue-600 dark:hover:text-blue-300">
                Mağazalar
              </Link>
              <span className="mx-2">·</span>
              <Link href={storeBaseHref} className="min-w-0 truncate hover:text-blue-600 dark:hover:text-blue-300">
                {detail.store.name}
              </Link>
              <span className="mx-2">·</span>
              <span className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100">
                {detail.product.name}
              </span>
            </div>
          </div>
        </nav>

        <section className="grid min-w-0 gap-5 md:gap-6 lg:grid-cols-[minmax(0,0.54fr)_minmax(380px,0.46fr)] lg:items-start">
          <ProductDetailGallery
            images={detail.product.images}
            fallbackImageUrl={detail.product.imageUrl}
            product={detail.product}
            productName={detail.product.name}
            viewerRole={viewerRole}
          />
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 md:p-6">
            <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{detail.store.name}</p>
            <div className="mt-2 flex min-w-0 items-start justify-between gap-3">
              <h1 className="min-w-0 break-words text-[28px] font-semibold leading-tight tracking-normal text-slate-950 dark:text-slate-50 md:text-[34px]">
                {detail.product.name}
              </h1>
              {!isStoreOwner ? (
                <FavoriteToggleButton
                  productId={detail.product.id}
                  productName={detail.product.name}
                  className="shrink-0"
                />
              ) : null}
            </div>
            <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
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
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {reviewSummary.average} / 5 ({reviewSummary.count} rəy)
                  </span>
                </>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">Hələ rəy yoxdur</span>
              )}
            </div>
            <p className="mt-6 break-words text-[32px] font-semibold leading-none text-slate-950 dark:text-slate-50 md:text-[36px]">
              {formatAznDiscountedPrice(
                detail.product.priceAmount,
                detail.product.discountAmount,
              )}
            </p>
            <p className={canBuy ? "mt-3 text-sm text-slate-500 dark:text-slate-400" : "mt-3 text-sm font-semibold text-destructive"}>
              {canBuy ? `Stok: ${detail.product.stockQuantity}` : "Stokda yoxdur"}
            </p>
            {detail.product.description ? (
              <p className="mt-5 break-words text-[15px] leading-7 text-slate-600 dark:text-slate-300">
                {detail.product.description}
              </p>
            ) : null}
            {isStoreOwner ? (
              <Button asChild className="mt-6 h-[52px] w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                <Link href={`/store/dashboard/products?edit=${detail.product.id}#edit-product-${detail.product.id}`}>
                  <Pencil className="mr-2 size-4" aria-hidden="true" />
                  Redaktə et
                </Link>
              </Button>
            ) : (
              <ProductPurchaseOptions
                product={detail.product}
                viewerRole={viewerRole}
                showWhatsappOrderButton={siteSettings.showWhatsappOrderButton}
                sellerPhone={sellerPhone}
                sellerName={detail.store.name}
                buyerName={current?.profile?.full_name ?? current?.user.email ?? ""}
                buyerPhone={current?.profile?.phone ?? ""}
                disabled={!canBuy}
              />
            )}
            <Button asChild variant="outline" className="mt-3 h-[52px] w-full rounded-xl border-slate-200 bg-white text-slate-900 shadow-none hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10 dark:hover:text-blue-200">
              <Link href={`${storeBaseHref === "/" ? "" : storeBaseHref}/products/${detail.product.slug}/questions`}>
                <MessageCircle className="mr-2 size-4" aria-hidden="true" />
                Sual & Cavablar
              </Link>
            </Button>
            {!isStoreOwner ? (
              <div className="mt-5 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/45">
                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(11rem,0.8fr)_minmax(0,1fr)]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      {detail.store.logoUrl ? (
                        <img
                          src={detail.store.logoUrl}
                          alt={detail.store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-semibold text-slate-500 dark:text-slate-400">
                          {detail.store.name.slice(0, 1).toLocaleUpperCase("az-AZ")}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Satıcı</p>
                      <h2 className="line-clamp-2 break-words text-base font-semibold leading-5 tracking-normal text-slate-950 dark:text-slate-50">
                        {detail.store.name}
                      </h2>
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex min-h-9 w-full min-w-0 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                      <Package className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                      <span className="min-w-0 break-words">{detail.store.productCount} məhsul</span>
                    </span>
                    <span className="inline-flex min-h-9 w-full min-w-0 items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                      <Clock3 className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                      <span className="min-w-0 break-words">{formatLastActive(detail.store.updatedAt)}</span>
                    </span>
                    {sellerAddress ? (
                      <span className="inline-flex min-h-9 w-full min-w-0 items-start gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                        <MapPin className="size-3.5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                        <span className="min-w-0 break-words leading-5">{sellerAddress}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-2">
                    <Button asChild variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-none hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10">
                      <Link href={storeBaseHref}>Mağazaya keç</Link>
                    </Button>
                    {sellerMapUrl ? (
                      <Button asChild variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-blue-600 shadow-none hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10">
                        <a href={sellerMapUrl} target="_blank" rel="noreferrer">
                          Xəritəni göstər
                          <ExternalLink className="ml-1.5 size-3.5" aria-hidden="true" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {relatedProducts ? (
          <div className="mt-8 scroll-mt-28 md:mt-10">
            <RelatedProductList
              initialProducts={relatedProducts.products}
              initialCursor={relatedProducts.nextCursor}
              initialHasMore={relatedProducts.hasMore}
              productId={detail.product.id}
              categoryId={detail.product.categoryId!}
              locale={locale}
            />
          </div>
        ) : null}

        <section className="mt-8 min-w-0 md:mt-10">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <h2 className="text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-50">Məhsul dəyərləndirməsi</h2>
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
        logoUrl={siteSettings.logoUrl}
        darkLogoUrl={siteSettings.darkLogoUrl}
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
