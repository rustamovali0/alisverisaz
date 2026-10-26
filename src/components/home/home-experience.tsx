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
    <div className="mb-3 flex items-center justify-between gap-3 md:mb-6">
      <h2 className="text-lg font-bold leading-tight tracking-[-0.02em] text-slate-950 dark:text-slate-50 sm:text-xl md:text-[26px]">
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
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-xs font-bold text-primary transition hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:hover:bg-orange-500/10 sm:px-3 sm:py-2 sm:text-sm"
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
      className="group flex min-h-14 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-slate-950 shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 sm:min-h-[64px] sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3 md:hover:-translate-y-1 md:hover:border-orange-200 md:hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600 transition group-hover:bg-primary group-hover:text-white dark:bg-orange-400/10 dark:text-orange-300 sm:size-11 sm:rounded-xl">
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
  const discoveryProducts = products.slice(0, 10);
  const regularProducts = products.filter((product) => !product.isPromoted);
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
      <div className="mx-auto w-full max-w-[1380px] space-y-7 md:space-y-16">
        <section className="relative isolate grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.65fr)]">
          <div className="relative min-h-[300px] overflow-hidden rounded-2xl bg-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:min-h-[500px] sm:rounded-[28px]">
            <OptimizedImage src={heroImageUrl} alt="" fill sizes="(max-width:1023px) 100vw, 68vw" className="object-cover opacity-55" priority />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.70)_48%,rgba(2,6,23,0.10)_100%)]" />
          <div className="relative z-10 min-w-0">
            <div className="flex min-h-[300px] max-w-2xl flex-col justify-end p-4 sm:min-h-[500px] sm:p-10 lg:p-12">
            <p className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-orange-200 backdrop-blur">{home("heroEyebrow")}</p>
            <h1 className="mt-3 max-w-[15ch] whitespace-pre-line text-[2rem] font-black leading-[1.02] tracking-[-0.045em] text-white sm:mt-5 sm:text-5xl lg:text-[3.7rem]">
              {displayHeroTitle}
            </h1>
            <p className="mt-3 line-clamp-2 max-w-lg text-xs leading-5 text-slate-200 sm:mt-4 sm:text-base sm:leading-6">
              {displayHeroDescription}
            </p>
            <div data-home-search-sentinel className="mt-5 h-px w-full" aria-hidden="true" />
            {popularSearchPills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {popularSearchPills.map((item) => (
                  <Link key={item.key} href={item.href} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-orange-300 hover:bg-orange-500/20">
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-4">
              {showSellerQuickActions ? (
                <Link href="/sell/product/new" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                  <BadgePlus className="size-4" aria-hidden="true" />
                  {home("createListing")}
                </Link>
              ) : null}
              <Link href="/stores" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                {home("allStores")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            </div>
          </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/products" className="group relative z-0 min-h-[210px] overflow-hidden rounded-[28px] bg-orange-500 p-7 text-white shadow-lg shadow-orange-950/10 transition-[transform,box-shadow] duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none md:hover:z-10 md:hover:scale-[1.035] md:hover:shadow-[0_26px_60px_rgba(234,88,12,0.28)]">
              <div className="absolute -right-12 -top-12 size-40 rounded-full border-[28px] border-white/10 transition-transform duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-125 group-hover:-rotate-12" />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-100">Yeni kolleksiya</p>
              <h2 className="mt-4 max-w-[10ch] text-3xl font-black leading-tight">Yeni məhsulları kəşf et</h2>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold">Məhsullara bax <ArrowRight className="size-4 transition-transform duration-300 motion-reduce:transform-none group-hover:translate-x-1.5" /></span>
            </Link>
            <Link href="/stores" className="group relative z-0 min-h-[210px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 p-7 text-slate-950 shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-900 dark:text-white md:hover:z-10 md:hover:scale-[1.035] md:hover:border-orange-200 md:hover:shadow-[0_26px_60px_rgba(15,23,42,0.16)]">
              {mobileHeroImageUrl ? <OptimizedImage src={mobileHeroImageUrl} alt="" fill sizes="360px" className="object-cover opacity-15" loading="lazy" /> : null}
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Etibarlı mağazalar</p>
                <h2 className="mt-4 max-w-[12ch] text-3xl font-black leading-tight">Satıcıları bir yerdə tap</h2>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-orange-600">Mağazaları aç <ArrowRight className="size-4 transition-transform duration-300 motion-reduce:transform-none group-hover:translate-x-1.5" /></span>
              </div>
            </Link>
          </div>
        </section>

        {activeCategories.length > 0 ? (
          <section data-home-categories>
            <SectionHeader
              title={home("exploreCategories")}
              mobileTitle={home("categories")}
              href="/categories"
              action={home("viewAll")}
            />
            <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
              {activeCategories.map((category) => (
                <div key={category.id} className="w-[46vw] max-w-[170px] shrink-0 snap-start sm:w-auto sm:max-w-none"><CategoryCard category={category} /></div>
              ))}
            </div>
          </section>
        ) : null}

        {discoveryProducts.length > 0 ? (
          <section>
            <SectionHeader title="Sənin üçün seçilənlər" href="/products" action={productsLabel} />
            <InfiniteProductGrid
              initialProducts={discoveryProducts}
              initialCursor={null}
              initialHasMore={false}
              locale={locale}
              sort="newest"
              productCardVariant={productCardVariant}
              compactMobileCards
              labels={{ stock: marketplace("stock") }}
            />
          </section>
        ) : null}

        {regularProducts.length > 0 ? (
          <section>
            <SectionHeader
              title={home("recentlyListed")}
              href="/products"
              action={productsLabel}
            />
            <InfiniteProductGrid
              initialProducts={regularProducts}
              initialCursor={productNextCursor}
              initialHasMore={productHasMore}
              locale={locale}
              sort="newest"
              productCardVariant={productCardVariant}
              compactMobileCards
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
              compactMobileCards
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
