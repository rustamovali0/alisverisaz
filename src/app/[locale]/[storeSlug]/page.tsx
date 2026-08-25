import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { Storefront } from "@/components/cart/product-marketplace";
import { getMarketplaceStoreBySlug } from "@/lib/cart/data";
import { trackActivityEvent } from "@/lib/activity/events";
import { getActiveHomeThemeSetting, getSiteSettings } from "@/lib/cms/data";
import {
  getStoreSubdomainSlug,
  getStorePath,
  getStorefrontUrl,
  isReservedStoreSubdomain,
} from "@/lib/config/domains";
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

  const canonicalUrl = getStorefrontUrl(store.slug);

  return {
    title: `${store.name} | Alışveriş`,
    description:
      store.description ||
      `${store.name} mağazasının yeni məhsulları Alışveriş-də.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${store.name} | Alışveriş`,
      description:
        store.description ||
        `${store.name} mağazasının aktiv yeni məhsulları.`,
      url: canonicalUrl,
      images: store.coverUrl ? [store.coverUrl] : undefined,
      type: "website",
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
  const storeBaseHref = storeSubdomainSlug === store.slug ? "/" : getStorePath(store.slug);

  const storeLocations = await getLocationsForStores([store.id]);
  const storeCategories = categories.filter((category) =>
    store.categoryIds.includes(category.id),
  );

  after(() => {
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
  });

  return (
    <>
      <ViewTracker storeId={store.id} />
      <Storefront
        store={store}
        categories={storeCategories}
        locations={storeLocations}
        selectedCategoryId={selectedCategory?.id}
        searchQuery={search?.q}
        locale={locale}
        storeBaseHref={storeBaseHref}
        productCardVariant={activeTheme.productCardVariant}
        isStoreOwner={isStoreOwner}
        footer={{
          siteName: siteSettings.shortName || siteSettings.siteName,
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
