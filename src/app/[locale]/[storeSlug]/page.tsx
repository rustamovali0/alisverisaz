import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { Storefront } from "@/components/cart/product-marketplace";
import { StoreJsonLd } from "@/components/seo/json-ld";
import { getMarketplaceStoreBySlug } from "@/lib/cart/data";
import { trackActivityEvent } from "@/lib/activity/events";
import { getActiveHomeThemeSetting, getSiteSettings } from "@/lib/cms/data";
import {
  getStoreSubdomainSlug,
  getStorePath,
  isReservedStoreSubdomain,
} from "@/lib/config/domains";
import { siteConfig } from "@/lib/config/site";
import { getLocationsForStores } from "@/lib/locations/data";
import { getCategoryOptions } from "@/lib/products/data";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getTranslations, setRequestLocale } from "next-intl/server";

type StorePageProps = {
  params: Promise<{
    locale: string;
    storeSlug: string;
  }>;
  searchParams?: Promise<{
    category?: string;
    q?: string;
  }>;
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

  const canonicalUrl = `${siteConfig.url}/store/${store.slug}`;
  const description =
    store.description ||
    `${store.name} mağazasının yeni məhsulları Alışveriş-də.`;

  return {
    title: `${store.name} | Alışveriş`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${store.name} | Alışveriş`,
      description,
      url: canonicalUrl,
      images: store.coverUrl ? [store.coverUrl] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${store.name} | Alışveriş`,
      description,
      images: store.coverUrl ? [store.coverUrl] : undefined,
    },
  };
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
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
    currentPath === `/store/${store.slug}` ||
    currentPath.startsWith(`/store/${store.slug}/`);
  const storeBaseHref = storeSubdomainSlug === store.slug
    ? "/"
    : isLegacyStoreRoute
      ? getStorePath(store.slug)
      : `/${store.slug}`;

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
      <StoreJsonLd store={store} url={`${siteConfig.url}/store/${store.slug}`} />
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
