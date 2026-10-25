"use client";

import type { CSSProperties } from "react";
import { OptimizedImage } from "@/components/common/optimized-image";
import {
  ArrowRight,
  BadgePlus,
  Crown,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { productQueryOptions } from "@/lib/query/product-options";

import { getCategoryIcon } from "@/components/categories/category-icons";
import { InfiniteProductGrid } from "@/components/cart/product-marketplace";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { Link } from "@/i18n/navigation";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import type { HomepageSection, SiteSettings } from "@/lib/cms/types";
import { getStorePath } from "@/lib/config/domains";
import type { AuthRole } from "@/lib/auth/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";

type HomeExperienceProps = {
  locale: string;
  siteSettings: SiteSettings;
  sections: HomepageSection[];
  activeTheme: string;
  themeConfig?: Record<string, unknown>;
  stores: MarketplaceStore[];
  products: CartProduct[];
  productNextCursor?: string | null;
  productHasMore?: boolean;
  categories: CategoryOption[];
  popularSearches?: string[];
  title: string;
  description: string;
  productsLabel: string;
  initialRole?: AuthRole | null;
};

const DEFAULT_MARKETPLACE_BANNER_URL = "/auth/auth-banner.webp";
const LEGACY_HERO_TITLE = "Alışverişdə hər mağaza öz vitrinini qurur";
const DEFAULT_HERO_TITLE = "ALISVERIS.AZ Alışverişin ünvanı";

function sectionByKey(sections: HomepageSection[], key: string) {
  return sections.find((section) => section.key === key);
}

function visibleLimit(section: HomepageSection | undefined, fallback: number) {
  return section?.itemLimit && section.itemLimit > 0 ? section.itemLimit : fallback;
}

function stringArraySetting(section: HomepageSection | undefined, key: string) {
  const value = section?.settings?.[key];

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function stringSetting(section: HomepageSection | undefined, key: string) {
  const value = section?.settings?.[key];

  return typeof value === "string" ? value.trim() : "";
}

function normalizeHeroTitle(value: string) {
  return value.trim() === LEGACY_HERO_TITLE ? DEFAULT_HERO_TITLE : value;
}

function isDefaultHeroTitle(value: string) {
  const normalized = value.trim().toLocaleLowerCase("az-AZ");

  return (
    normalized === LEGACY_HERO_TITLE.toLocaleLowerCase("az-AZ") ||
    normalized === DEFAULT_HERO_TITLE.toLocaleLowerCase("az-AZ") ||
    normalized === "alisveris.az"
  );
}

const homeDesignStyle: CSSProperties & Record<string, string> = {
  "--background": "0 0% 100%",
  "--foreground": "221 39% 12%",
  "--card": "0 0% 100%",
  "--card-foreground": "221 39% 12%",
  "--muted": "210 24% 95%",
  "--muted-foreground": "215 16% 43%",
  "--border": "214 20% 88%",
  "--input": "214 20% 88%",
  "--primary": "24 95% 53%",
  "--primary-foreground": "0 0% 100%",
  "--ring": "24 95% 53%",
  "--marketplace-primary": "24 95% 53%",
  "--marketplace-primary-hover": "17 88% 48%",
  "--marketplace-primary-hover-foreground": "0 0% 100%",
  "--marketplace-primary-soft": "33 100% 96%",
  "--marketplace-navy": "221 39% 12%",
  "--marketplace-muted": "215 16% 43%",
} as const;

const TAP_AZ_CATEGORY_ORDER = [
  "ev-ve-bag-ucun",
  "ev-ve-bag",
  "elektronika",
  "neqliyyat",
  "ehtiyat-hisseleri-ve-aksesuarlar",
  "ehtiyat-hisseleri",
  "aksesuarlar",
  "dasinmaz-emlak",
  "xidmetler-ve-biznes",
  "xidmetler",
  "biznes",
  "sexsi-esyalar",
  "shexsi-esyalar",
  "hobbi-ve-asude",
  "hobbi",
  "meiset-texnikasi",
  "məişət-texnikası",
  "telefonlar",
  "usaq-alemi",
  "ana-ve-usaq",
  "is-elanlari",
  "heyvanlar",
  "nomreler-ve-sim-kartlar",
  "nomreler",
  "sim-kartlar",
  "magazalar",
];

function sortTapAzLikeCategories(categories: CategoryOption[]) {
  const order = new Map(TAP_AZ_CATEGORY_ORDER.map((slug, index) => [slug, index]));

  return [...categories].sort((a, b) => {
    const aOrder = order.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order.get(b.slug) ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.name.localeCompare(b.name, "az");
  });
}

function SectionHeader({
  title,
  mobileTitle,
  href,
  action,
}: {
  title: string;
  mobileTitle?: string;
  href: string;
  action: string;
}) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const prefetch = () => {
    if (href === "/products") void queryClient.prefetchInfiniteQuery(productQueryOptions({ locale }));
  };
  return (
    <div className="mb-4 flex items-center justify-between gap-4 md:mb-6">
      <h2 className="text-xl font-semibold leading-tight tracking-normal text-slate-950 dark:text-slate-50 md:text-[26px]">
        {mobileTitle ? (
          <>
            <span className="md:hidden">{mobileTitle}</span>
            <span className="hidden md:inline">{title}</span>
          </>
        ) : (
          title
        )}
      </h2>
      <Link
        href={href}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        scroll
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-primary transition hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:hover:bg-orange-500/10"
      >
        {action}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryOption }) {
  const CategoryIcon = getCategoryIcon(category);

  return (
    <Link
      href={`/products?category=${category.slug}`}
      className="group flex min-h-[64px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950 shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 md:hover:-translate-y-1 md:hover:border-orange-200 md:hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-primary group-hover:text-white dark:bg-orange-400/10 dark:text-orange-300 sm:size-11">
        <CategoryIcon className="size-4 stroke-[2.1] sm:size-[18px]" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium leading-4 sm:text-[13px]">
          {category.name}
        </span>
        <ArrowRight className="hidden size-3.5 shrink-0 text-slate-400 transition sm:block md:group-hover:translate-x-0.5 md:group-hover:text-orange-600" />
      </span>
    </Link>
  );
}

function HomeStoreCard({
  store,
  compact = false,
  showPromotionBadge = false,
}: {
  store: MarketplaceStore;
  compact?: boolean;
  showPromotionBadge?: boolean;
}) {
  const marketplace = useTranslations("marketplace");
  const coverUrl = store.coverUrl || store.sampleProducts[0]?.imageUrl || null;

  return (
    <article className="group h-full min-w-0 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 dark:border-slate-800 dark:bg-slate-900 md:hover:-translate-y-1 md:hover:border-orange-200 md:hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
      <Link
        href={getStorePath(store.slug)}
        className="relative block h-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="relative">
          <div className={cn("relative overflow-hidden rounded-t-2xl bg-stone-100 dark:bg-slate-800", compact ? "aspect-[16/7]" : "aspect-[16/8]")}>
            {coverUrl ? (
              <OptimizedImage
                src={coverUrl}
                alt={store.name}
                fill
                sizes="(max-width: 767px) 270px, (max-width: 1023px) 50vw, 320px"
                className="h-full w-full object-cover transition duration-200 md:group-hover:scale-[1.015]"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#f8fafc,#ecfdf5)] dark:bg-[linear-gradient(135deg,#1e293b,#052e2b)]">
                <span className="text-4xl font-black text-orange-600/60 dark:text-orange-300/60">
                  {store.name.slice(0, 1).toLocaleUpperCase("az-AZ")}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/28 to-transparent" />
            {store.isPromoted && showPromotionBadge ? (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-black text-amber-700 shadow-sm ring-1 ring-white/70 backdrop-blur">
                <Crown className="size-3" aria-hidden="true" />
                Önə çıxarılıb
              </span>
            ) : null}
          </div>
          <div className="absolute -bottom-6 left-3 z-30 grid size-12 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white text-lg font-black text-orange-600 shadow-lg shadow-slate-950/12 dark:border-slate-900 dark:bg-slate-900 dark:text-orange-300 md:-bottom-7 md:left-4 md:size-14">
            {store.logoUrl ? (
              <OptimizedImage
                src={store.logoUrl}
                alt={store.name}
                width={56}
                height={56}
                sizes="56px"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              store.name.slice(0, 1).toLocaleUpperCase("az-AZ")
            )}
          </div>
        </div>
        <div className="relative z-10 flex min-h-[94px] flex-col justify-between rounded-b-xl bg-white px-3 pb-3 pt-8 dark:bg-slate-900 md:min-h-[112px] md:px-4 md:pb-4 md:pt-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 break-words text-[15px] font-semibold leading-5 tracking-normal text-slate-950 dark:text-slate-50 sm:text-base">
                {store.name}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {marketplace("productCount", { count: store.productCount })}
              </p>
            </div>
            <ArrowRight className="mt-1 hidden size-4 text-slate-400 transition sm:size-5 md:block md:group-hover:translate-x-0.5 md:group-hover:text-orange-600" />
          </div>
        </div>
      </Link>
    </article>
  );
}

export function HomeExperience({
  locale,
  siteSettings,
  sections,
  activeTheme,
  themeConfig,
  stores,
  products,
  productNextCursor,
  productHasMore,
  categories,
  popularSearches = [],
  title,
  description,
  productsLabel,
  initialRole = null,
}: HomeExperienceProps) {
  const home = useTranslations("home");
  const marketplace = useTranslations("marketplace");
  const hero = sectionByKey(sections, "hero");
  const categorySection = sectionByKey(sections, "categories");
  const featuredSection = sectionByKey(sections, "featured_products");
  const heroImageUrl = hero?.imageUrl.trim() || DEFAULT_MARKETPLACE_BANNER_URL;
  const mobileHeroImageUrl = stringSetting(hero, "mobileImageUrl");
  const productCardVariant =
    activeTheme === "liquid-glass" ? "liquid-glass" : undefined;
  const alphabeticalStores = [...stores].filter((store) => store.productCount > 0).sort((a, b) =>
    a.name.localeCompare(b.name, "az"),
  );
  const selectedFeaturedStoreIds = stringArraySetting(featuredSection, "storeIds");
  const selectedFeaturedStores =
    selectedFeaturedStoreIds.length > 0
      ? selectedFeaturedStoreIds
          .map((storeId) => alphabeticalStores.find((store) => store.id === storeId))
          .filter((store): store is MarketplaceStore => Boolean(store))
      : alphabeticalStores;
  const featuredStores = selectedFeaturedStores
    .map((store, index) => ({ store, index }))
    .sort((left, right) => {
      if (left.store.isPromoted !== right.store.isPromoted) {
        return left.store.isPromoted ? -1 : 1;
      }
      return left.index - right.index;
    })
    .map(({ store }) => store)
    .slice(
    0,
    visibleLimit(featuredSection, 8),
  );
  const activeCategories = sortTapAzLikeCategories(categories).slice(
    0,
    visibleLimit(categorySection, 36),
  );
  const heroPills = activeCategories.slice(0, 4);
  const popularSearchPills = popularSearches.length
    ? popularSearches.slice(0, 4).map((term) => ({
        key: term,
        label: term,
        href: `/products?q=${encodeURIComponent(term)}`,
      }))
    : heroPills.map((category) => ({
        key: category.id,
        label: category.name,
        href: `/products?category=${category.slug}`,
      }));
  const heroTitle = normalizeHeroTitle(hero?.title || title);
  const shouldUseDefaultHeroCopy = isDefaultHeroTitle(heroTitle);
  const displayHeroTitle = shouldUseDefaultHeroCopy
    ? home("defaultHeroTitle")
    : heroTitle;
  const displayHeroDescription =
    shouldUseDefaultHeroCopy
      ? home("defaultHeroDescription")
      : hero?.description || description;

  const themeAccent =
    typeof themeConfig?.accent === "string" ? themeConfig.accent : undefined;
  const showSellerQuickActions = initialRole === null || initialRole === "seller";
  const promotedProducts = products.filter((product) => product.isPromoted).slice(0, 8);
  const discountedProducts = products.filter((product) => product.discountAmount > 0).slice(0, 8);

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-clip bg-white px-3 pb-0 pt-3 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-5 md:pb-10 md:pt-6 lg:px-8"
      data-homepage-preset={siteSettings.design.homepagePreset}
      style={{
        ...homeDesignStyle,
        ...(themeAccent ? { "--marketplace-primary": themeAccent } : {}),
      }}
    >
      <div className="mx-auto w-full max-w-[1380px] space-y-10 md:space-y-16">
        <section className="relative isolate grid min-w-0 gap-8 overflow-hidden rounded-3xl border border-orange-100 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.13),transparent_42%),linear-gradient(135deg,#fff7ed,#ffffff_58%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-orange-500/15 dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_42%),linear-gradient(135deg,#17120f,#0f172a_58%)] sm:p-9 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:gap-12 lg:p-12">
          <div className="relative z-10 min-w-0">
            <p className="inline-flex rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">{home("heroEyebrow")}</p>
            <h1 className="mt-5 max-w-[17ch] whitespace-pre-line text-[2.35rem] font-black leading-[1.06] tracking-[-0.04em] text-slate-950 dark:text-slate-50 sm:text-5xl lg:text-[3.6rem]">
              {displayHeroTitle}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {displayHeroDescription}
            </p>
            <div data-home-search-sentinel className="mt-5 h-px w-full" aria-hidden="true" />
            <MarketplaceSearch
              stores={stores}
              className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-950"
              inputClassName="h-12 rounded-xl border-0 bg-transparent pl-11 text-base shadow-none focus-visible:ring-2 focus-visible:ring-primary"
              buttonClassName="rounded-xl bg-primary px-6 text-white shadow-md shadow-primary/20 hover:bg-orange-600"
              compactActions
              placeholder={home("heroSearchPlaceholder")}
            />
            {popularSearchPills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {popularSearchPills.map((item) => (
                  <Link key={item.key} href={item.href} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:text-orange-300">
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {showSellerQuickActions ? (
                <Link href="/sell/product/new" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                  <BadgePlus className="size-4" aria-hidden="true" />
                  {home("createListing")}
                </Link>
              ) : null}
              <Link href="/stores" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-orange-300">
                {home("allStores")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="relative hidden min-h-[360px] overflow-hidden rounded-2xl shadow-2xl shadow-slate-950/20 lg:block" aria-hidden="true">
            <OptimizedImage src={heroImageUrl} alt="" fill sizes="430px" className="object-cover" loading="lazy" />
          </div>
          {mobileHeroImageUrl ? (
            <div className="relative h-36 overflow-hidden rounded-xl lg:hidden" aria-hidden="true">
              <OptimizedImage src={mobileHeroImageUrl} alt="" fill sizes="100vw" className="object-cover" loading="lazy" />
            </div>
          ) : null}
        </section>

        {activeCategories.length > 0 ? (
          <section data-home-categories>
            <SectionHeader
              title={home("exploreCategories")}
              mobileTitle={home("categories")}
              href="/categories"
              action={home("viewAll")}
            />
            <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {activeCategories.map((category) => (
                <div key={category.id} className="w-[72vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none"><CategoryCard category={category} /></div>
              ))}
            </div>
          </section>
        ) : null}

        {promotedProducts.length > 0 ? (
          <section>
            <SectionHeader title="Sənin üçün seçilənlər" href="/products" action={productsLabel} />
            <InfiniteProductGrid
              initialProducts={promotedProducts}
              initialCursor={null}
              initialHasMore={false}
              locale={locale}
              sort="newest"
              productCardVariant={productCardVariant}
              labels={{ stock: marketplace("stock") }}
            />
          </section>
        ) : null}

        {discountedProducts.length > 0 ? (
          <section className="rounded-3xl bg-orange-50/70 px-3 py-6 dark:bg-orange-500/5 sm:px-6 sm:py-8">
            <SectionHeader title="Endirimli məhsullar" href="/products" action={productsLabel} />
            <InfiniteProductGrid
              initialProducts={discountedProducts}
              initialCursor={null}
              initialHasMore={false}
              locale={locale}
              sort="newest"
              productCardVariant={productCardVariant}
              labels={{ stock: marketplace("stock") }}
            />
          </section>
        ) : null}

        {products.length > 0 ? (
          <section>
            <SectionHeader
              title={home("recentlyListed")}
              href="/products"
              action={productsLabel}
            />
            <InfiniteProductGrid
              initialProducts={products}
              initialCursor={productNextCursor}
              initialHasMore={productHasMore}
              locale={locale}
              sort="newest"
              productCardVariant={productCardVariant}
              labels={{ stock: marketplace("stock") }}
            />
          </section>
        ) : null}
        {featuredStores.length > 0 ? (
          <section id="featured-stores">
            <SectionHeader
              title={featuredSection?.title || home("featuredStores")}
              href="/stores"
              action={home("viewAll")}
            />
            <div className="flex snap-x gap-3 overflow-x-auto pb-1 pr-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pr-0 lg:grid-cols-4">
              {featuredStores.map((store, index) => (
                <div
                  key={store.id}
                  className={cn(
                    "w-[56vw] max-w-[218px] shrink-0 snap-start md:w-auto md:max-w-none",
                    index >= 4 && "hidden lg:block",
                  )}
                >
                  <HomeStoreCard
                    store={store}
                    compact={index > 1}
                    showPromotionBadge={initialRole === "seller"}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
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
