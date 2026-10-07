"use client";

import type { CSSProperties } from "react";
import { OptimizedImage } from "@/components/common/optimized-image";
import {
  ArrowRight,
  BadgePlus,
  Bot,
  Building2,
  Crown,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Store,
  Truck,
  type LucideIcon,
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
  "--muted": "42 36% 94%",
  "--muted-foreground": "215 16% 43%",
  "--border": "35 23% 86%",
  "--input": "35 23% 86%",
  "--primary": "217 91% 60%",
  "--primary-foreground": "0 0% 100%",
  "--ring": "217 91% 60%",
  "--marketplace-primary": "217 91% 60%",
  "--marketplace-primary-hover": "221 83% 53%",
  "--marketplace-primary-hover-foreground": "0 0% 100%",
  "--marketplace-primary-soft": "214 100% 97%",
  "--marketplace-navy": "221 39% 12%",
  "--marketplace-muted": "215 16% 43%",
} as const;

const trustItems = [
  {
    icon: Package,
    title: "Geniş seçim",
    description: "Yeni elanlar",
  },
  {
    icon: Store,
    title: "Mağazalar",
    description: "Satıcı vitrinləri",
  },
  {
    icon: ShieldCheck,
    title: "Yoxlanış",
    description: "Admin nəzarəti",
  },
  {
    icon: Truck,
    title: "Çatdırılma",
    description: "Mağaza şərtləri",
  },
];

const modeTabs = [
  { label: "Elanlar", href: "/products", icon: Search },
  { label: "Mağazalar", href: "/stores", icon: Building2 },
  { label: "Məhsullar", href: "/products?sort=newest", icon: Package },
];

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
      <h2 className="text-xl font-black leading-tight tracking-normal text-slate-950 dark:text-slate-50 md:text-[26px]">
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
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-1 text-sm font-bold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:text-blue-300 dark:hover:text-blue-200"
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
      className="group flex min-h-[50px] min-w-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 sm:min-h-[56px] sm:px-3 md:hover:-translate-y-0.5 md:hover:border-blue-200 md:hover:shadow-[0_8px_22px_rgba(15,23,42,0.07)]"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 transition dark:bg-blue-400/10 dark:text-blue-300 sm:size-9">
        <CategoryIcon className="size-4 stroke-[2.1] sm:size-[18px]" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <span className="truncate text-[12px] font-bold leading-4 sm:text-[13px]">
          {category.name}
        </span>
        <ArrowRight className="hidden size-3.5 shrink-0 text-slate-400 transition sm:block md:group-hover:translate-x-0.5 md:group-hover:text-blue-700" />
      </span>
    </Link>
  );
}

function HomeStoreCard({ store, compact = false }: { store: MarketplaceStore; compact?: boolean }) {
  const marketplace = useTranslations("marketplace");
  const coverUrl = store.coverUrl || store.sampleProducts[0]?.imageUrl || null;

  return (
    <article className="group h-full min-w-0 overflow-visible rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 dark:border-slate-800 dark:bg-slate-900 md:hover:-translate-y-0.5 md:hover:border-blue-200 md:hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
      <Link
        href={getStorePath(store.slug)}
        className="relative block h-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <div className="relative">
          <div className={cn("relative overflow-hidden rounded-t-xl bg-stone-100 dark:bg-slate-800", compact ? "aspect-[16/7]" : "aspect-[16/8]")}>
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
                <span className="text-4xl font-black text-blue-700/50 dark:text-blue-300/50">
                  {store.name.slice(0, 1).toLocaleUpperCase("az-AZ")}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/28 to-transparent" />
            {store.isPromoted ? (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-black text-amber-700 shadow-sm ring-1 ring-white/70 backdrop-blur">
                <Crown className="size-3" aria-hidden="true" />
                Önə çıxarılıb
              </span>
            ) : null}
          </div>
          <div className="absolute -bottom-6 left-3 z-30 grid size-12 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white text-lg font-black text-blue-700 shadow-lg shadow-slate-950/12 dark:border-slate-900 dark:bg-slate-900 dark:text-blue-300 md:-bottom-7 md:left-4 md:size-14">
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
              <h3 className="line-clamp-2 break-words text-[15px] font-black leading-5 tracking-normal text-slate-950 dark:text-slate-50 sm:text-base">
                {store.name}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {marketplace("productCount", { count: store.productCount })}
              </p>
            </div>
            <ArrowRight className="mt-1 hidden size-4 text-slate-400 transition sm:size-5 md:block md:group-hover:translate-x-0.5 md:group-hover:text-blue-700" />
          </div>
        </div>
      </Link>
    </article>
  );
}

function QuickActionTile({
  href,
  title,
  description,
  icon: Icon,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 items-center gap-2 rounded-xl border border-stone-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-blue-200 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 sm:gap-3 sm:p-3"
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg sm:size-11", tone)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-black leading-4 text-slate-950 dark:text-slate-50 sm:text-sm">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">
          {description}
        </span>
      </span>
    </Link>
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
  const alphabeticalStores = [...stores].sort((a, b) =>
    a.name.localeCompare(b.name, "az"),
  );
  const selectedFeaturedStoreIds = stringArraySetting(featuredSection, "storeIds");
  const selectedFeaturedStores =
    selectedFeaturedStoreIds.length > 0
      ? selectedFeaturedStoreIds
          .map((storeId) => alphabeticalStores.find((store) => store.id === storeId))
          .filter((store): store is MarketplaceStore => Boolean(store))
      : alphabeticalStores;
  const featuredStores = selectedFeaturedStores.slice(
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
    ? "Axtar. Tap. Al."
    : heroTitle;
  const displayHeroDescription =
    shouldUseDefaultHeroCopy
      ? "Mağazalar, elanlar və gündəlik fürsətlər bir yerdə. Mobildən sürətli bax, müqayisə et və satıcı ilə əlaqə saxla."
      : hero?.description || description;
  const heroBackgroundImage = mobileHeroImageUrl || heroImageUrl;
  const themeAccent =
    typeof themeConfig?.accent === "string" ? themeConfig.accent : undefined;
  const showSellerQuickActions = initialRole === null || initialRole === "seller";

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-clip bg-white px-3 pb-[calc(92px+env(safe-area-inset-bottom))] pt-3 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-5 md:pb-10 md:pt-6 lg:px-8"
      data-homepage-preset={siteSettings.design.homepagePreset}
      style={{
        ...homeDesignStyle,
        ...(themeAccent ? { "--marketplace-primary": themeAccent } : {}),
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] space-y-8 md:space-y-14">
        <section className="grid min-w-0 gap-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-stretch">
          <aside className="hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">
                Kateqoriyalar
              </h2>
              <Link href="/categories" className="text-xs font-bold text-blue-700">
                Hamısı
              </Link>
            </div>
            <div className="grid gap-1.5">
              {activeCategories.slice(0, 22).map((category) => {
                const CategoryIcon = getCategoryIcon(category);

                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-800 dark:text-slate-200 dark:hover:bg-blue-400/10 dark:hover:text-blue-200"
                  >
                    <CategoryIcon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{category.name}</span>
                  </Link>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
            <div className="relative min-h-[560px] overflow-hidden md:min-h-[510px]">
              {heroBackgroundImage ? (
                <OptimizedImage
                  src={heroBackgroundImage}
                  alt={shouldUseDefaultHeroCopy ? "Alışveriş marketplace" : heroTitle}
                  fill
                  sizes="(max-width: 1023px) 100vw, 1024px"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.72)_0%,rgba(15,23,42,0.42)_38%,rgba(255,255,255,0.96)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.74)_0%,rgba(2,6,23,0.54)_38%,rgba(2,6,23,0.98)_100%)]" />

              <div className="relative z-10 flex min-h-[560px] flex-col justify-between p-4 text-white sm:p-5 md:min-h-[510px] md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm backdrop-blur">
                      <MapPin className="size-3.5 text-blue-700" aria-hidden="true" />
                      <span className="truncate">Azərbaycan üzrə elanlar</span>
                    </div>
                    <h1 className="mt-4 max-w-[11ch] text-[2.5rem] font-black leading-[0.96] tracking-normal min-[390px]:text-[2.8rem] sm:max-w-[12ch] sm:text-[3.4rem] md:text-[4.2rem]">
                      {displayHeroTitle}
                    </h1>
                  </div>
                  {showSellerQuickActions ? (
                    <Link
                      href="/store/dashboard/products/new"
                      className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ffcf4a] text-slate-950 shadow-[0_10px_28px_rgba(0,0,0,0.22)] transition hover:bg-[#ffd866] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:hidden"
                      aria-label="Elan yerləşdir"
                    >
                      <BadgePlus className="size-6" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="mb-4 max-w-xl text-[15px] font-medium leading-6 text-white/88 sm:text-base md:text-lg">
                    {displayHeroDescription}
                  </p>

                  <div data-home-search-sentinel className="h-px w-full" aria-hidden="true" />
                  <div className="rounded-2xl border border-white/62 bg-white p-2 text-slate-950 shadow-[0_18px_48px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                    <MarketplaceSearch
                      stores={stores}
                      className="rounded-xl border-0 bg-transparent p-0 shadow-none"
                      inputClassName="h-[52px] rounded-xl border-transparent bg-stone-50 pl-11 text-[16px] text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 dark:bg-slate-800 dark:text-slate-50 md:h-[54px]"
                      buttonClassName="!size-[48px] !min-w-[48px] rounded-xl bg-blue-700 p-0 text-white hover:bg-blue-800"
                      buttonSize="lg"
                      stackOnMobile
                      compactActions
                      placeholder={home("heroSearchPlaceholder")}
                    />
                    <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-slate-800">
                      {modeTabs.map((item) => {
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-black text-slate-600 transition first:bg-white first:text-blue-800 first:shadow-sm hover:bg-white hover:text-blue-800 dark:text-slate-300 dark:first:bg-slate-900 dark:first:text-blue-200 dark:hover:bg-slate-900"
                          >
                            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {showSellerQuickActions ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <QuickActionTile
                        href="/store/dashboard/products/new"
                        title="Elan ver"
                        description="30 saniyə"
                        icon={BadgePlus}
                        tone="bg-[#ffcf4a] text-slate-950"
                      />
                      <QuickActionTile
                        href="/store/dashboard/products/new"
                        title="AI kömək"
                        description="Mətn hazırla"
                        icon={Bot}
                        tone="bg-blue-50 text-blue-700"
                      />
                    </div>
                  ) : null}

                  {popularSearchPills.length > 0 ? (
                    <div className="-mx-4 mt-4 flex max-w-[calc(100%+2rem)] items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-5 sm:max-w-[calc(100%+2.5rem)] sm:px-5 md:mx-0 md:max-w-full md:flex-wrap md:overflow-visible md:px-0">
                      {popularSearchPills.map((item) => (
                        <Link
                          key={item.key}
                          href={item.href}
                          className="inline-flex h-9 shrink-0 items-center rounded-full border border-white/72 bg-white/88 px-3 text-[13px] font-black text-slate-800 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

        </section>

        <section className="grid grid-cols-2 gap-2 dark:border-slate-800 md:border-y md:border-stone-200 md:py-5 lg:grid-cols-4 lg:gap-4">
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex min-w-0 items-start gap-2.5 rounded-xl bg-white p-3 ring-1 ring-stone-200 dark:bg-slate-900 dark:ring-slate-800 md:rounded-none md:bg-transparent md:p-0 md:ring-0 lg:border-r lg:border-stone-200 lg:last:border-r-0 dark:lg:border-slate-800"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20 md:size-10">
                  <Icon className="size-4 md:size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-5 text-slate-950 dark:text-slate-50 md:text-[15px]">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500 dark:text-slate-400 md:text-sm">
                    {item.description}
                  </span>
                </span>
              </div>
            );
          })}
        </section>

        {activeCategories.length > 0 ? (
          <section data-home-categories>
            <SectionHeader
              title={home("exploreCategories")}
              mobileTitle={home("categories")}
              href="/categories"
              action={home("viewAll")}
            />
            <div className="grid grid-flow-col grid-rows-2 auto-cols-[164px] gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-auto sm:grid-flow-row sm:grid-rows-none sm:grid-cols-3 sm:gap-2.5 sm:overflow-visible md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {activeCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>
        ) : null}

        {featuredStores.length > 0 ? (
          <section id="featured-stores">
            <SectionHeader
              title={featuredSection?.title || home("featuredStores")}
              href="/stores"
              action={home("viewAll")}
            />
            <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-5 sm:px-5 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4">
              {featuredStores.map((store, index) => (
                <div
                  key={store.id}
                  className={cn(
                    "w-[70vw] max-w-[270px] shrink-0 snap-start md:w-auto md:max-w-none",
                    index >= 4 && "hidden lg:block",
                  )}
                >
                  <HomeStoreCard store={store} compact={index > 1} />
                </div>
              ))}
            </div>
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
