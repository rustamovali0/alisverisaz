import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { Storefront } from "@/components/cart/product-marketplace";
import { BreadcrumbJsonLd, StoreJsonLd } from "@/components/seo/json-ld";
import { getMarketplaceStoreBySlug } from "@/lib/cart/data";
import { trackActivityEvent } from "@/lib/activity/events";
import { getActiveHomeThemeSetting, getSiteSettings } from "@/lib/cms/data";
import {
  getStoreSubdomainSlug,
  getStorefrontUrl,
  getStorePath,
  isReservedStoreSubdomain,
} from "@/lib/config/domains";
import { siteConfig } from "@/lib/config/site";
import { getLocationsForStores } from "@/lib/locations/data";
import { getCategoryOptions } from "@/lib/products/data";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";

export type StorePageProps = {
  params: Promise<{
    locale: string;
    storeSlug: string;
  }>;
  searchParams?: Promise<{
    category?: string;
    q?: string;
  }>;
};

type StorePageRenderOptions = {
  forceMarketplaceRoute?: boolean;
};

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { locale, storeSlug } = await params;

  if (isReservedStoreSubdomain(storeSlug)) {
    return {};
  }

  const store = await getMarketplaceStoreBySlug({
    slug: storeSlug,
    locale,
  });

  if (!store) {
    return {};
  }

  const requestHeaders = await headers();
  const currentPath = requestHeaders.get("x-current-path") ?? "";
  const storeSubdomainSlug = getStoreSubdomainSlug(requestHeaders.get("host"));
  const isMarketplaceRoute =
    currentPath === `/store/${store.slug}` ||
    currentPath.startsWith(`/store/${store.slug}/`);
  const canonicalUrl =
    storeSubdomainSlug === store.slug
      ? getStorefrontUrl(store.slug)
      : isMarketplaceRoute
        ? `${siteConfig.url}/store/${store.slug}`
        : `${siteConfig.url}/${store.slug}`;
  const pageTitle = isMarketplaceRoute
    ? `${store.name} mağazası | Alışveriş`
    : `${store.name} | Rəsmi onlayn mağaza`;
  const description =
    store.description ||
    `${store.name} mağazasının yeni məhsulları, kateqoriyaları və əlaqə məlumatları.`;

  return {
    title: pageTitle,
    description,
    keywords: [
      store.name,
      `${store.name} məhsulları`,
      `${store.name} online mağaza`,
      `${store.name} əlaqə`,
      "Azərbaycanda online alışveriş",
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
      title: pageTitle,
      description,
      url: canonicalUrl,
      images: store.coverUrl ? [store.coverUrl] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: store.coverUrl ? [store.coverUrl] : undefined,
    },
  };
}

export async function renderStorePage(
  { params, searchParams }: StorePageProps,
  options: StorePageRenderOptions = {},
) {
  const { locale, storeSlug } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  if (isReservedStoreSubdomain(storeSlug)) {
    notFound();
  }

  const t = await getTranslations("marketplace");
  const common = await getTranslations("common");
  const [categories, siteSettings, activeTheme, current] = await Promise.all([
    getCategoryOptions({ rootOnly: true }),
    getSiteSettings(),
    getActiveHomeThemeSetting(),
    getCurrentUserProfile(),
  ]);
  const selectedCategory = categories.find(
    (category) => category.slug === search?.category || category.id === search?.category,
  );
  const store = await getMarketplaceStoreBySlug({
    slug: storeSlug,
    locale,
  });

  if (!store) {
    notFound();
  }

  const isStoreOwner =
    current?.role === "seller" && current.user.id === store.ownerId;

  const requestHeaders = await headers();
  const storeSubdomainSlug = getStoreSubdomainSlug(requestHeaders.get("host"));
  const currentPath = requestHeaders.get("x-current-path") ?? "";
  const isLegacyStoreRoute =
    options.forceMarketplaceRoute ||
    currentPath === `/store/${store.slug}` ||
    currentPath.startsWith(`/store/${store.slug}/`) ||
    currentPath === `/${locale}/store/${store.slug}` ||
    currentPath.startsWith(`/${locale}/store/${store.slug}/`);
  const storeBaseHref = storeSubdomainSlug === store.slug
    ? "/"
    : isLegacyStoreRoute
      ? getStorePath(store.slug)
      : `/${store.slug}`;
  const canonicalStoreUrl = storeSubdomainSlug === store.slug
    ? getStorefrontUrl(store.slug)
    : isLegacyStoreRoute
      ? `${siteConfig.url}/store/${store.slug}`
      : `${siteConfig.url}/${store.slug}`;

  const storeLocations = await getLocationsForStores([store.id]);

  void trackActivityEvent({
    eventType: "store_view",
    storeId: store.id,
    metadata: {
      title: "Mağaza açıldı",
      description: store.name,
      store_name: store.name,
      store_slug: store.slug,
    },
  });

  return (
    <>
      <ViewTracker storeId={store.id} />
      <StoreJsonLd store={store} url={canonicalStoreUrl} />
      <BreadcrumbJsonLd
        items={[
          { name: "Alışveriş", item: siteConfig.url },
          {
            name: isLegacyStoreRoute ? "Mağazalar" : store.name,
            item: isLegacyStoreRoute ? `${siteConfig.url}/stores` : canonicalStoreUrl,
          },
          ...(isLegacyStoreRoute
            ? [{ name: store.name, item: canonicalStoreUrl }]
            : []),
        ]}
      />
      <Storefront
        store={store}
        categories={categories}
        locations={storeLocations}
        selectedCategoryId={selectedCategory?.id}
        searchQuery={search?.q}
        locale={locale}
        storeBaseHref={storeBaseHref}
        productCardVariant={activeTheme.productCardVariant}
        legacyLayout={isLegacyStoreRoute}
        storeSubdomainSlug={storeSubdomainSlug}
        isStoreOwner={isStoreOwner}
        footer={{
          siteName: siteSettings.shortName || siteSettings.siteName,
          logoUrl: siteSettings.logoUrl,
          darkLogoUrl: siteSettings.darkLogoUrl,
          description: siteSettings.defaultMetaDescription,
          socialLinks: {
            instagram: siteSettings.socialLinks.instagram,
            tiktok: siteSettings.socialLinks.tiktok,
            whatsapp: siteSettings.socialLinks.whatsapp || siteSettings.whatsapp,
          },
        }}
        labels={{
          title: t("title"),
          description: t("description"),
          emptyTitle: t("emptyTitle"),
          emptyDescription: t("emptyDescription"),
          stock: t("stock"),
          cart: common("cart"),
        }}
      />
    </>
  );
}

export default async function StorePage(props: StorePageProps) {
  return renderStorePage(props);
}
