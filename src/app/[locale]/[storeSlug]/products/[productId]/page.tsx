import "@/components/products/product-detail.css";
import { ArrowLeft, ArrowUpRight, MapPin, MessageCircle, Pencil, Star, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import { ViewTracker } from "@/components/analytics/view-tracker";
import {
  CustomStoreFooter,
} from "@/components/cart/product-marketplace";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  ProductReviewList,
} from "@/components/products/product-feedback-lists";
import { ProductDetailPrice } from "@/components/products/product-detail-price";
import { storePolicyFields } from "@/lib/store-settings/policies";
import { getEnabledProductOptions } from "@/lib/products/variant-utils";
import { ProductPurchaseOptions } from "@/components/products/product-purchase-options";
import { RelatedProductList } from "@/components/products/related-product-list";
import {
  ProductDetailGallery,
} from "@/components/products/product-detail-gallery";
import { ProductDetailScrollReset } from "@/components/products/product-detail-scroll-reset";
import { ProductReviewForm } from "@/components/reviews/product-review-form";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/json-ld";
import { Link } from "@/i18n/navigation";
import { trackActivityEvent } from "@/lib/activity/events";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMarketplaceProductById } from "@/lib/cart/data";
import { getSiteSettings } from "@/lib/cms/data";
import { getStorePath, getStorefrontUrl, getStoreSubdomainSlug } from "@/lib/config/domains";
import { siteConfig } from "@/lib/config/site";
import { formatAznDiscountedPrice, formatAznPrice } from "@/lib/format";
import {
  getLocationsForStores,
  getPublicProductLocations,
} from "@/lib/locations/data";
import type { ProductLocationAvailability } from "@/lib/locations/types";
import { normalizeGoogleMapLink } from "@/lib/locations/map-link";
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
  const safeMapLink = normalizeGoogleMapLink(location.mapLink ?? "");
  if (safeMapLink) {
    return safeMapLink;
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

  const requestHeaders = await headers();
  const currentPath = requestHeaders.get("x-current-path") ?? "";
  const storeSubdomainSlug = getStoreSubdomainSlug(requestHeaders.get("host"));
  const isMarketplaceRoute =
    currentPath === `/store/${detail.store.slug}/products/${detail.product.slug}` ||
    currentPath === `/store/${detail.store.slug}/products/${detail.product.id}` ||
    currentPath.startsWith(`/store/${detail.store.slug}/products/`);
  const isCustomStorefrontAllowed = detail.store.customStorefrontEnabled === true;
  if (!isMarketplaceRoute && storeSubdomainSlug !== detail.store.slug && !isCustomStorefrontAllowed) {
    return {};
  }
  if (storeSubdomainSlug === detail.store.slug && !isCustomStorefrontAllowed) {
    return {};
  }
  const canonicalUrl = isCustomStorefrontAllowed
    ? getStorefrontUrl(detail.store.slug, `/products/${detail.product.slug}`)
    : `${siteConfig.url}/store/${detail.store.slug}/products/${detail.product.slug}`;
  const price = formatAznDiscountedPrice(
    detail.product.priceAmount,
    detail.product.discountAmount,
  );
  const description =
    detail.product.description ||
    `${detail.product.name} ${detail.store.name} (${detail.store.slug}) mağazasında ${price}. Alışveriş.az-da stok və sifariş məlumatlarına baxın.`;

  return {
    title: `${detail.product.name} | ${detail.store.name} (${detail.store.slug})`,
    description,
    keywords: [
      detail.product.name,
      detail.store.name,
      detail.store.slug,
      isCustomStorefrontAllowed
        ? `${detail.store.slug}.alisveris.az`
        : `alisveris.az/store/${detail.store.slug}`,
      `${detail.product.name} qiyməti`,
      `${detail.product.name} al`,
      `${detail.store.name} rəsmi mağaza`,
      `${detail.store.name} Alışveriş.az`,
      "online alışveriş Azərbaycan",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
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
    visibleProductLocations.find((item) => item.location.showAddress)?.location ?? null;
  const sellerAddress = formatShortLocation(sellerLocation) ?? detail.store.address;
  const sellerPhone =
    detail.store.whatsappPhone?.trim() ||
    (sellerLocation ?? visibleProductLocations[0]?.location)?.phone?.trim() ||
    detail.store.phone?.trim() ||
    "";
  const sellerMapUrl = sellerLocation
    ? getLocationMapUrl(sellerLocation)
    : sellerAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sellerAddress)}`
      : null;
  const requestHeaders = await headers();
  const storeSubdomainSlug = getStoreSubdomainSlug(requestHeaders.get("host"));
  const currentPath = requestHeaders.get("x-current-path") ?? "";
  const isLegacyProductRoute =
    currentPath === `/store/${detail.store.slug}/products/${detail.product.slug}` ||
    currentPath === `/store/${detail.store.slug}/products/${detail.product.id}` ||
    currentPath.startsWith(`/store/${detail.store.slug}/products/`);
  const isCustomStorefrontAllowed = detail.store.customStorefrontEnabled === true;
  const marketplaceHomeRedirect = storeSubdomainSlug ? siteConfig.url : "/";

  if (!isLegacyProductRoute && storeSubdomainSlug !== detail.store.slug && !isCustomStorefrontAllowed) {
    redirect(marketplaceHomeRedirect);
  }

  if (storeSubdomainSlug === detail.store.slug && !isCustomStorefrontAllowed) {
    redirect(marketplaceHomeRedirect);
  }

  const isCustomStorefrontProduct = !isLegacyProductRoute;
  const isSellerViewer = isStoreOwner;
  const canWriteReview = !isStoreOwner &&
    (current?.role === "customer" || current?.role === "seller" || isCustomStorefrontProduct);
  const storeBaseHref =
    storeSubdomainSlug === detail.store.slug
      ? "/"
      : isLegacyProductRoute
        ? getStorePath(detail.store.slug)
        : `/${detail.store.slug}`;
  const canonicalProductUrl = isCustomStorefrontAllowed
    ? getStorefrontUrl(detail.store.slug, `/products/${detail.product.slug}`)
    : `${siteConfig.url}/store/${detail.store.slug}/products/${detail.product.slug}`;
  const canonicalStoreUrl = isCustomStorefrontAllowed
    ? getStorefrontUrl(detail.store.slug)
    : `${siteConfig.url}/store/${detail.store.slug}`;
  const breadcrumbHomeLabel = isCustomStorefrontProduct ? "Ana səhifə" : "Mağazalar";
  const breadcrumbHomeHref = isCustomStorefrontProduct ? storeBaseHref : "/stores";

  const options = getEnabledProductOptions(detail.product.options ?? []);
  const hasPolicies = storePolicyFields.some(({ key }) => Boolean(detail.store.policies?.[key]));
  const questionsHref = `${storeBaseHref === "/" ? "" : storeBaseHref}/products/${detail.product.slug}/questions`;

  return (
    <main className={viewerRole === "seller" ? "pdp" : "pdp pdp-has-buy-bar"}>
      <ProductDetailScrollReset />
      <ProductJsonLd
        detail={detail}
        url={canonicalProductUrl}
        sellerUrl={canonicalStoreUrl}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Alışveriş", item: siteConfig.url },
          {
            name: isCustomStorefrontProduct ? detail.store.name : "Mağazalar",
            item: isCustomStorefrontProduct ? canonicalStoreUrl : `${siteConfig.url}/stores`,
          },
          ...(isCustomStorefrontProduct
            ? []
            : [{ name: detail.store.name, item: canonicalStoreUrl }]),
          { name: detail.product.name, item: canonicalProductUrl },
        ]}
      />
      {!isStoreOwner ? <ViewTracker productId={detail.product.id} /> : null}
      <div className="pdp-container">
        <nav className="pdp-breadcrumb" aria-label="Səhifənin yolu">
          <Link href={breadcrumbHomeHref}><ArrowLeft size={16} aria-hidden /> {breadcrumbHomeLabel}</Link>
          {!isCustomStorefrontProduct && <Link href={storeBaseHref}>{detail.store.name}</Link>}
          <span aria-current="page" title={detail.product.name}>{detail.product.name}</span>
        </nav>

        <div className="pdp-overview">
          <ProductDetailGallery key={detail.product.id} images={detail.product.images}
            fallbackImageUrl={detail.product.imageUrl} product={detail.product} viewerRole={viewerRole}
            isolatedStoreSlug={isCustomStorefrontProduct ? detail.store.slug : undefined} />
          <section className="pdp-information" aria-labelledby="product-title">
            <div className="pdp-title-row">
              <div>
                <Link className="pdp-eyebrow" href={storeBaseHref}>{detail.store.name}</Link>
                <h1 id="product-title">{detail.product.name}</h1>
              </div>
              {!isStoreOwner && !isCustomStorefrontProduct && (
                <FavoriteToggleButton productId={detail.product.id} productName={detail.product.name}
                  favoriteCount={detail.favoriteCount} className="shrink-0" />
              )}
            </div>

            <div className="pdp-meta">
              {reviewSummary.count > 0 && (
                <a href="#pdp-reviews" className="pdp-rating">
                  <Star size={16} fill="currentColor" aria-hidden />
                  <strong>{reviewSummary.average} / 5</strong> ({reviewSummary.count} rəy)
                </a>
              )}
              {detail.category && <Link href={`${storeBaseHref === "/" ? "" : storeBaseHref}/products?category=${encodeURIComponent(detail.category.slug)}`}>{detail.category.name}</Link>}
              {detail.product.commerceType === "rental" && <span>İcarə</span>}
              {detail.product.isPromoted && <span>VIP</span>}
            </div>

            {isStoreOwner ? (
              <>
                <ProductDetailPrice product={detail.product} stock={detail.product.stockQuantity} />
                <Link className="pdp-secondary-action" href={`/sell/product/${detail.product.id}/edit`}>
                  <Pencil size={17} aria-hidden /> Redaktə et
                </Link>
              </>
            ) : (
              <ProductPurchaseOptions key={detail.product.id} product={detail.product} viewerRole={viewerRole}
                showWhatsappOrderButton sellerPhone={sellerPhone} sellerName={detail.store.name}
                buyerName={current?.profile?.full_name ?? current?.user.email ?? ""}
                buyerPhone={current?.profile?.phone ?? ""} disabled={!canBuy}
                isolatedStoreSlug={isCustomStorefrontProduct ? detail.store.slug : null}
                isolatedStoreBaseHref={isCustomStorefrontProduct ? storeBaseHref : null} />
            )}

            {!isSellerViewer && (
              <div className="pdp-quick-info">
                {hasPolicies && <a href="#pdp-policies"><Truck size={18} aria-hidden /> Çatdırılma və qaytarma <ArrowUpRight size={16} aria-hidden /></a>}
                <Link href={questionsHref}><MessageCircle size={18} aria-hidden /> Sual və cavablar <ArrowUpRight size={16} aria-hidden /></Link>
              </div>
            )}

            {!isStoreOwner && (
              <a href="#pdp-seller" className="pdp-seller-preview">
                {detail.store.logoUrl
                  ? <img src={detail.store.logoUrl} alt="" loading="lazy" width={44} height={44} />
                  : <Store size={24} aria-hidden />}
                <span><small>Satıcı</small><strong>{detail.store.name}</strong></span>
                <ArrowUpRight size={18} aria-hidden />
              </a>
            )}
          </section>
        </div>

        <div className="pdp-details">
          <div className="pdp-detail-content">
            {detail.product.description?.trim() && (
              <section id="pdp-description" className="pdp-section">
                <p className="pdp-eyebrow">Məhsul detalları</p>
                <h2>Məhsul haqqında</h2>
                <p className="pdp-prose">{detail.product.description.trim()}</p>
              </section>
            )}
            {(options.length > 0 || detail.product.depositEnabled) && (
              <section id="pdp-specifications" className="pdp-section">
                <h2>Məhsul xüsusiyyətləri</h2>
                <dl className="pdp-facts">
                  {options.map((option) => (
                    <div key={option.type}><dt>{option.name}</dt><dd>{option.values.map((value) => value.value).join(", ")}</dd></div>
                  ))}
                  {detail.product.depositEnabled && <div><dt>Depozit</dt><dd>{formatAznPrice(detail.product.depositAmount)}</dd></div>}
                </dl>
              </section>
            )}
            {hasPolicies && (
              <section id="pdp-policies" className="pdp-section">
                <h2>Çatdırılma və qaytarma</h2>
                <dl className="pdp-facts">
                  {storePolicyFields.map(({ key, label }) => detail.store.policies?.[key] && (
                    <div key={key}><dt>{label}</dt><dd>{detail.store.policies[key]}</dd></div>
                  ))}
                </dl>
              </section>
            )}
            <section id="pdp-reviews" className="pdp-section">
              <h2>Alıcı rəyləri {reviewSummary.count > 0 && <small>({reviewSummary.count})</small>}</h2>
              {canWriteReview && (
                <ProductReviewForm productId={detail.product.id} storeSlug={detail.store.slug}
                  viewerRole={viewerRole} reviewId={currentReview?.id ?? null}
                  initialRating={currentReview?.rating ?? 0} initialComment={currentReview?.comment ?? ""}
                  allowGuest={isCustomStorefrontProduct} />
              )}
              <ProductReviewList reviews={reviews} />
            </section>
          </div>

          <aside className="pdp-detail-sidebar">
            <section id="pdp-seller" className="pdp-section">
              <p className="pdp-eyebrow">Mağaza</p>
              <h2>{detail.store.name}</h2>
              <p>{detail.store.productCount} məhsul</p>
              {detail.store.description?.trim() && <p className="pdp-prose">{detail.store.description.trim()}</p>}
              {sellerAddress && <p className="pdp-address"><MapPin size={17} aria-hidden /> {sellerAddress}</p>}
              <div className="pdp-section-links">
                <Link className="pdp-secondary-action" href={storeBaseHref}>Mağazaya keç <ArrowUpRight size={16} aria-hidden /></Link>
                {sellerMapUrl && <a className="pdp-secondary-action" href={sellerMapUrl} target="_blank" rel="noreferrer">
                  Xəritədə bax <ArrowUpRight size={16} aria-hidden />
                </a>}
              </div>
            </section>
            {!isSellerViewer && (
              <section id="pdp-questions" className="pdp-section">
                <h2>Suallar və cavablar</h2>
                <p>Məhsulla bağlı sualınızı satıcıya ünvanlayın.</p>
                <Link className="pdp-secondary-action" href={questionsHref}>
                  <MessageCircle size={17} aria-hidden /> Suallara keç
                </Link>
              </section>
            )}
          </aside>
        </div>

        {detail.product.categoryId && (
          <div className="pdp-related">
            <RelatedProductList initialProducts={[]} initialCursor={null} initialHasMore
              productId={detail.product.id} categoryId={detail.product.categoryId}
              storeId={isCustomStorefrontProduct ? detail.store.id : undefined}
              isolatedStoreSlug={isCustomStorefrontProduct ? detail.store.slug : undefined} locale={locale} />
          </div>
        )}
      </div>
      {isCustomStorefrontProduct ? (
        <>
          <CustomStoreFooter store={detail.store} storeHomeHref={storeBaseHref} />
          <MobileBottomNav
            storeHomeHref={storeBaseHref}
            storeSubdomainSlug={storeSubdomainSlug}
            storeId={detail.store.id}
            isolatedStorefront={isCustomStorefrontProduct}
            sellerOwnsStore={isStoreOwner}
          />
        </>
      ) : (
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
      )}
    </main>
  );
}
