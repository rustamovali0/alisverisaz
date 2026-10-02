"use client";

import type { CSSProperties } from "react";
import {
  ArrowRight,
  BadgePlus,
  Bot,
  Building2,
  Clock3,
  Crown,
  Flame,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { getCategoryIcon } from "@/components/categories/category-icons";
import { InfiniteProductGrid } from "@/components/cart/product-marketplace";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { Link } from "@/i18n/navigation";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import type { HomepageSection, SiteSettings } from "@/lib/cms/types";
import { getStorePath } from "@/lib/config/domains";
import { formatAznDiscountedPrice } from "@/lib/format";
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
  "--background": "42 56% 97%",
  "--foreground": "221 39% 12%",
  "--card": "0 0% 100%",
  "--card-foreground": "221 39% 12%",
  "--muted": "42 36% 94%",
  "--muted-foreground": "215 16% 43%",
  "--border": "35 23% 86%",
  "--input": "35 23% 86%",
  "--primary": "153 58% 34%",
  "--primary-foreground": "0 0% 100%",
  "--ring": "153 58% 34%",
  "--marketplace-primary": "153 58% 34%",
  "--marketplace-primary-hover": "153 62% 28%",
  "--marketplace-primary-hover-foreground": "0 0% 100%",
  "--marketplace-primary-soft": "146 48% 94%",
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

const feedTabs = [
  { label: "Təcili", icon: Flame, tone: "text-rose-700 bg-rose-50 ring-rose-100" },
  { label: "Video", icon: Sparkles, tone: "text-violet-700 bg-violet-50 ring-violet-100" },
  { label: "VIP", icon: Crown, tone: "text-amber-700 bg-amber-50 ring-amber-100" },
  { label: "Yeni", icon: Clock3, tone: "text-emerald-700 bg-emerald-50 ring-emerald-100" },
];

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
        scroll
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-1 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-300 dark:hover:text-emerald-200"
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
      className="group grid min-h-[86px] min-w-0 grid-rows-[auto_1fr] gap-3 rounded-xl border border-stone-200 bg-white p-3 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 sm:min-h-[118px] sm:p-4 md:hover:-translate-y-0.5 md:hover:border-emerald-200 md:hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
    >
      <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 transition dark:bg-emerald-400/10 dark:text-emerald-300 sm:size-11">
        <CategoryIcon className="size-5 stroke-[2.1] sm:size-6" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 items-end justify-between gap-3">
        <span className="line-clamp-2 min-w-0 break-words text-[13px] font-bold leading-4 sm:text-base sm:leading-5">
          {category.name}
        </span>
        <ArrowRight className="hidden size-4 shrink-0 text-slate-400 transition sm:block md:group-hover:translate-x-0.5 md:group-hover:text-emerald-700" />
      </span>
    </Link>
  );
}

function MiniProductCard({ product }: { product: CartProduct }) {
  const productHref =
    product.storeSlug && product.slug
      ? `/${product.storeSlug}/products/${product.slug}`
      : "/products";

  return (
    <Link
      href={productHref}
      className="grid min-w-0 grid-cols-[68px_minmax(0,1fr)] gap-3 rounded-xl border border-stone-200 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-emerald-200 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-stone-100 dark:bg-slate-800">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-emerald-700">
            <Package className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 py-1">
        <div className={cn(
          "mb-1 inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase ring-1",
          product.isPromoted
            ? "bg-amber-50 text-amber-700 ring-amber-100"
            : "bg-emerald-50 text-emerald-700 ring-emerald-100",
        )}>
          {product.isPromoted ? "Önə çıxarılıb" : "Yeni elan"}
        </div>
        <h3 className="line-clamp-2 text-sm font-black leading-4 text-slate-950 dark:text-slate-50">
          {product.name}
        </h3>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
          {product.storeName ?? "Mağaza"}
        </p>
        <p className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-300">
          {formatAznDiscountedPrice(product.priceAmount, product.discountAmount)}
        </p>
      </div>
    </Link>
  );
}

function HomeStoreCard({ store, compact = false }: { store: MarketplaceStore; compact?: boolean }) {
  const marketplace = useTranslations("marketplace");
  const coverUrl = store.coverUrl || store.sampleProducts[0]?.imageUrl || null;

  return (
    <article className="group h-full min-w-0 overflow-visible rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 dark:border-slate-800 dark:bg-slate-900 md:hover:-translate-y-0.5 md:hover:border-emerald-200 md:hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
      <Link
        href={getStorePath(store.slug)}
        className="relative block h-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        <div className="relative">
          <div className={cn("overflow-hidden rounded-t-xl bg-stone-100 dark:bg-slate-800", compact ? "aspect-[16/7]" : "aspect-[16/8]")}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={store.name}
                className="h-full w-full object-cover transition duration-200 md:group-hover:scale-[1.015]"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#f8fafc,#ecfdf5)] dark:bg-[linear-gradient(135deg,#1e293b,#052e2b)]">
                <span className="text-4xl font-black text-emerald-700/50 dark:text-emerald-300/50">
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
          <div className="absolute -bottom-6 left-3 z-30 grid size-12 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white text-lg font-black text-emerald-700 shadow-lg shadow-slate-950/12 dark:border-slate-900 dark:bg-slate-900 dark:text-emerald-300 md:-bottom-7 md:left-4 md:size-14">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
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
            <ArrowRight className="mt-1 hidden size-4 text-slate-400 transition sm:size-5 md:block md:group-hover:translate-x-0.5 md:group-hover:text-emerald-700" />
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
      className="flex min-w-0 items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-emerald-200 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900"
    >
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg", tone)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-slate-950 dark:text-slate-50">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
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
  const activeCategories = categories.slice(0, visibleLimit(categorySection, 12));
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
  const previewProducts = products.slice(0, 3);
  const featuredStorePreview = featuredStores.slice(0, 2);
  const themeAccent =
    typeof themeConfig?.accent === "string" ? themeConfig.accent : undefined;

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-clip bg-[#f7f2e9] px-3 pb-[calc(92px+env(safe-area-inset-bottom))] pt-3 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-5 md:pb-10 md:pt-6 lg:px-8"
      data-homepage-preset={siteSettings.design.homepagePreset}
      style={{
        ...homeDesignStyle,
        ...(themeAccent ? { "--marketplace-primary": themeAccent } : {}),
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] space-y-8 md:space-y-14">
        <section className="grid min-w-0 gap-4 lg:grid-cols-[248px_minmax(0,1fr)_324px] lg:items-stretch">
          <aside className="hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">
                Kateqoriyalar
              </h2>
              <Link href="/categories" className="text-xs font-bold text-emerald-700">
                Hamısı
              </Link>
            </div>
            <div className="grid gap-1.5">
              {activeCategories.slice(0, 9).map((category) => {
                const CategoryIcon = getCategoryIcon(category);

                return (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
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
                <img
                  src={heroBackgroundImage}
                  alt={shouldUseDefaultHeroCopy ? "Alışveriş marketplace" : heroTitle}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.72)_0%,rgba(15,23,42,0.42)_38%,rgba(247,242,233,0.96)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.74)_0%,rgba(2,6,23,0.54)_38%,rgba(2,6,23,0.98)_100%)]" />

              <div className="relative z-10 flex min-h-[560px] flex-col justify-between p-4 text-white sm:p-5 md:min-h-[510px] md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm backdrop-blur">
                      <MapPin className="size-3.5 text-emerald-700" aria-hidden="true" />
                      <span className="truncate">Azərbaycan üzrə elanlar</span>
                    </div>
                    <h1 className="mt-4 max-w-[11ch] text-[2.5rem] font-black leading-[0.96] tracking-normal min-[390px]:text-[2.8rem] sm:max-w-[12ch] sm:text-[3.4rem] md:text-[4.2rem]">
                      {displayHeroTitle}
                    </h1>
                  </div>
                  <Link
                    href="/store/dashboard/products/new"
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ffcf4a] text-slate-950 shadow-[0_10px_28px_rgba(0,0,0,0.22)] transition hover:bg-[#ffd866] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:hidden"
                    aria-label="Elan yerləşdir"
                  >
                    <BadgePlus className="size-6" aria-hidden="true" />
                  </Link>
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
                      buttonClassName="!size-[48px] !min-w-[48px] rounded-xl bg-emerald-700 p-0 text-white hover:bg-emerald-800"
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
                            className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-black text-slate-600 transition first:bg-white first:text-emerald-800 first:shadow-sm hover:bg-white hover:text-emerald-800 dark:text-slate-300 dark:first:bg-slate-900 dark:first:text-emerald-200 dark:hover:bg-slate-900"
                          >
                            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <QuickActionTile
                      href="/store/dashboard/products/new"
                      title="Elan yerləşdir"
                      description="30 saniyəyə başla"
                      icon={BadgePlus}
                      tone="bg-[#ffcf4a] text-slate-950"
                    />
                    <QuickActionTile
                      href="/store/dashboard/products/new"
                      title="AI ilə doldur"
                      description="Mətnə kömək"
                      icon={Bot}
                      tone="bg-emerald-50 text-emerald-700"
                    />
                  </div>

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

          <aside className="grid gap-3 lg:content-between">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-950 dark:text-slate-50">
                  Canlı lent
                </h2>
                <Link href="/products" className="text-xs font-bold text-emerald-700">
                  Aç
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {feedTabs.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href="/products"
                      className={cn(
                        "grid min-h-14 place-items-center rounded-xl px-1 py-2 text-center text-[11px] font-black ring-1",
                        item.tone,
                      )}
                    >
                      <Icon className="mb-1 size-4" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {previewProducts.length > 0 ? (
              <div className="grid gap-2">
                {previewProducts.map((product) => (
                  <MiniProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : null}
          </aside>
        </section>

        <section className="grid grid-cols-2 gap-2 dark:border-slate-800 md:border-y md:border-stone-200 md:py-5 lg:grid-cols-4 lg:gap-4">
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex min-w-0 items-start gap-2.5 rounded-xl bg-white p-3 ring-1 ring-stone-200 dark:bg-slate-900 dark:ring-slate-800 md:rounded-none md:bg-transparent md:p-0 md:ring-0 lg:border-r lg:border-stone-200 lg:last:border-r-0 dark:lg:border-slate-800"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20 md:size-10">
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
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6">
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

        {featuredStorePreview.length > 0 ? (
          <section className="grid gap-3 md:hidden" aria-label="Seçilmiş mağazalar">
            {featuredStorePreview.map((store) => (
              <Link
                key={store.id}
                href={getStorePath(store.slug)}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-emerald-50 text-lg font-black text-emerald-700">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                  ) : (
                    store.name.slice(0, 1).toLocaleUpperCase("az-AZ")
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-950 dark:text-slate-50">
                    {store.name}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    {marketplace("productCount", { count: store.productCount })}
                  </span>
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            ))}
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
