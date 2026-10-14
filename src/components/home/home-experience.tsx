"use client";

import type { CSSProperties } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BadgePlus,
  Crown,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

import { OptimizedImage } from "@/components/common/optimized-image";
import { getCategoryIcon } from "@/components/categories/category-icons";
import { InfiniteProductGrid } from "@/components/cart/product-marketplace";
import { SiteFooter } from "@/components/layout/site-footer";
import { Link } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import { getStorePath } from "@/lib/config/domains";
import type { HomepageSection, SiteSettings } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";
import { productQueryOptions } from "@/lib/query/product-options";
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
  "--muted": "220 20% 97%",
  "--muted-foreground": "215 16% 43%",
  "--border": "220 13% 91%",
  "--input": "220 13% 91%",
  "--primary": "10 100% 58%",
  "--primary-foreground": "0 0% 100%",
  "--ring": "10 100% 58%",
  "--marketplace-primary": "10 100% 58%",
  "--marketplace-primary-hover": "9 81% 52%",
  "--marketplace-primary-hover-foreground": "0 0% 100%",
  "--marketplace-primary-soft": "10 100% 97%",
  "--marketplace-navy": "221 39% 12%",
  "--marketplace-muted": "215 16% 43%",
} as const;

const trustItems: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: ShieldCheck,
    title: "Təsdiqli mağazalar",
    description: "Admin nəzarəti ilə",
  },
  {
    icon: Store,
    title: "Mağazaları kəşf et",
    description: "Seçimləri müqayisə et",
  },
  {
    icon: Package,
    title: "Yeni məhsullar",
    description: "Gündəlik yenilənən vitrin",
  },
  {
    icon: ShoppingBag,
    title: "Rahat sifariş",
    description: "Səbətdən davam et",
  },
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
    if (href === "/products") {
      void queryClient.prefetchInfiniteQuery(productQueryOptions({ locale }));
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-4 md:mb-5">
      <h2 className="text-[22px] font-bold leading-tight tracking-normal text-slate-950 dark:text-slate-50 md:text-[26px]">
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
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#e83e22] transition hover:text-[#bf321c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/35 focus-visible:ring-offset-2 dark:text-orange-300 dark:hover:text-orange-200"
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
      className="group flex min-h-[96px] min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-3 text-center text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/35 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 md:min-h-[112px] md:hover:-translate-y-0.5 md:hover:border-[#ff4b2b]/35 md:hover:shadow-[0_8px_22px_rgba(15,23,42,0.07)]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0ec] text-[#e83e22] transition dark:bg-orange-400/10 dark:text-orange-300 md:group-hover:bg-[#ff4b2b] md:group-hover:text-white">
        <CategoryIcon className="size-5 stroke-[1.8]" aria-hidden="true" />
      </span>
      <span className="line-clamp-2 text-[12px] font-semibold leading-4 sm:text-[13px]">
        {category.name}
      </span>
    </Link>
  );
}

function HomeStoreCard({ store }: { store: MarketplaceStore }) {
  const marketplace = useTranslations("marketplace");
  const coverUrl = store.coverUrl || store.sampleProducts[0]?.imageUrl || null;

  return (
    <article className="group h-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 dark:border-slate-800 dark:bg-slate-900 md:hover:-translate-y-0.5 md:hover:border-[#ff4b2b]/30 md:hover:shadow-[0_8px_22px_rgba(15,23,42,0.07)]">
      <Link
        href={getStorePath(store.slug)}
        className="block h-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/35 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[16/7] overflow-hidden bg-slate-100 dark:bg-slate-800">
          {coverUrl ? (
            <OptimizedImage
              src={coverUrl}
              alt={store.name}
              fill
              sizes="(max-width: 767px) 176px, (max-width: 1023px) 33vw, 260px"
              className="h-full w-full object-cover transition duration-200 md:group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[#fff4f0] dark:bg-orange-400/10">
              <span className="text-2xl font-bold text-[#e83e22]/55 dark:text-orange-300/60">
                {store.name.slice(0, 1).toLocaleUpperCase("az-AZ")}
              </span>
            </div>
          )}
          {store.isPromoted ? (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-1 text-[10px] font-semibold text-amber-700 shadow-sm">
              <Crown className="size-3" aria-hidden="true" />
              Seçilmiş
            </span>
          ) : null}
          <span className="absolute -bottom-4 left-3 grid size-9 place-items-center overflow-hidden rounded-lg border-2 border-white bg-white text-sm font-bold text-[#e83e22] shadow-md dark:border-slate-900 dark:bg-slate-900 dark:text-orange-300">
            {store.logoUrl ? (
              <OptimizedImage
                src={store.logoUrl}
                alt={store.name}
                width={36}
                height={36}
                sizes="36px"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              store.name.slice(0, 1).toLocaleUpperCase("az-AZ")
            )}
          </span>
        </div>
        <div className="min-h-[72px] px-3 pb-2.5 pt-6">
          <h3 className="line-clamp-1 break-words text-[14px] font-semibold leading-5 text-slate-950 dark:text-slate-50">
            {store.name}
          </h3>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
            {marketplace("productCount", { count: store.productCount })}
          </p>
        </div>
      </Link>
    </article>
  );
}

const campaignStyles = [
  {
    eyebrow: "Yeni gələnlər",
    title: "Yeni məhsulları kəşf et",
    className: "bg-slate-950 text-white",
    labelClassName: "text-white/70",
  },
  {
    eyebrow: "Mağazalardan",
    title: "Seçilmiş məhsullar",
    className: "bg-[#f7eee9] text-slate-950",
    labelClassName: "text-slate-500",
  },
  {
    eyebrow: "Kəşf et",
    title: "Vitrinlərə bax",
    className: "bg-[#f4edf8] text-slate-950",
    labelClassName: "text-slate-500",
  },
];

function CampaignCard({ product, index }: { product: CartProduct; index: number }) {
  const style = campaignStyles[index % campaignStyles.length];
  const href = product.storeSlug
    ? `${getStorePath(product.storeSlug)}/products/${product.slug}`
    : "/products";

  return (
    <Link
      href={href}
      className={cn(
        "group relative isolate min-h-[176px] overflow-hidden rounded-lg p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/40 focus-visible:ring-offset-2 sm:min-h-[196px]",
        style.className,
      )}
    >
      <div className="relative z-10 flex h-full max-w-[58%] flex-col items-start">
        <span className={cn("text-xs font-semibold", style.labelClassName)}>{style.eyebrow}</span>
        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-tight sm:text-xl">{style.title}</h3>
        <p className={cn("mt-2 line-clamp-2 text-sm", style.labelClassName)}>{product.name}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold">
          Bax
          <ArrowRight className="size-4 transition-transform md:group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
      {product.imageUrl ? (
        <div className="absolute bottom-0 right-0 top-0 w-[56%]">
          <OptimizedImage
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 767px) 72vw, (max-width: 1023px) 33vw, 420px"
            className="object-contain p-3 transition-transform duration-200 md:group-hover:scale-[1.035]"
            loading="lazy"
          />
        </div>
      ) : (
        <ShoppingBag className="absolute bottom-5 right-5 size-16 opacity-20" aria-hidden="true" />
      )}
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
  const productCardVariant = activeTheme === "liquid-glass" ? "liquid-glass" : undefined;
  const alphabeticalStores = [...stores].sort((a, b) => a.name.localeCompare(b.name, "az"));
  const selectedFeaturedStoreIds = stringArraySetting(featuredSection, "storeIds");
  const selectedFeaturedStores =
    selectedFeaturedStoreIds.length > 0
      ? selectedFeaturedStoreIds
          .map((storeId) => alphabeticalStores.find((store) => store.id === storeId))
          .filter((store): store is MarketplaceStore => Boolean(store))
      : alphabeticalStores;
  const featuredStores = selectedFeaturedStores.slice(0, visibleLimit(featuredSection, 8));
  const activeCategories = sortTapAzLikeCategories(categories).slice(
    0,
    Math.min(visibleLimit(categorySection, 12), 12),
  );
  const heroTitle = normalizeHeroTitle(hero?.title || title);
  const shouldUseDefaultHeroCopy = isDefaultHeroTitle(heroTitle);
  const displayHeroTitle = shouldUseDefaultHeroCopy
    ? "Evdə rahatlıq, həyatda keyfiyyət!"
    : heroTitle;
  const displayHeroDescription = shouldUseDefaultHeroCopy
    ? "Seçdiyiniz məhsulları mağazalardan rahat araşdırın və sifarişinizi bir yerdə idarə edin."
    : hero?.description || description;
  const heroBackgroundImage = mobileHeroImageUrl || heroImageUrl;
  const themeAccent = typeof themeConfig?.accent === "string" ? themeConfig.accent : undefined;
  const heroActionLabel = hero?.buttonLabel?.trim() || "İndi bax";
  const heroActionHref = hero?.buttonUrl?.trim() || "/products";
  const campaignProducts = products.slice(0, 3);

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-clip bg-white pb-[calc(82px+env(safe-area-inset-bottom))] text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:pb-0"
      data-homepage-preset={siteSettings.design.homepagePreset}
      style={{
        ...homeDesignStyle,
        ...(themeAccent ? { "--marketplace-primary": themeAccent } : {}),
      }}
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-9 px-4 pt-4 sm:px-6 md:space-y-12 md:pt-6 lg:px-8">
        <section className="relative isolate min-h-[344px] overflow-hidden rounded-xl border border-slate-200 bg-[#f8f8f7] shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 md:min-h-[392px]">
          <OptimizedImage
            src={heroBackgroundImage}
            alt={shouldUseDefaultHeroCopy ? "Alışveriş marketplace" : heroTitle}
            fill
            sizes="100vw"
            className="object-cover object-[70%_center]"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.93)_38%,rgba(255,255,255,0.24)_72%,rgba(255,255,255,0.05)_100%)] dark:bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.84)_45%,rgba(2,6,23,0.26)_76%,rgba(2,6,23,0.12)_100%)]" />
          <div className="relative z-10 flex min-h-[344px] max-w-xl flex-col justify-center px-5 py-8 sm:px-9 md:min-h-[392px] md:px-12">
            <span className="inline-flex w-fit items-center rounded-full bg-[#ff4b2b] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              Yeni gələnlər
            </span>
            <h1 className="mt-4 max-w-[13ch] text-[2.15rem] font-bold leading-[1.04] tracking-normal text-slate-950 dark:text-white sm:text-[3rem] md:text-[3.5rem]">
              {displayHeroTitle}
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {displayHeroDescription}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={heroActionHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ff4b2b] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(255,75,43,0.22)] transition hover:bg-[#e83e22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/45 focus-visible:ring-offset-2"
              >
                {heroActionLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {initialRole === "seller" ? (
                <Link
                  href="/sell/product/new"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white/85 px-4 text-sm font-semibold text-slate-900 transition hover:border-[#ff4b2b]/40 hover:text-[#e83e22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/35 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                >
                  <BadgePlus className="size-4" aria-hidden="true" />
                  Məhsul əlavə et
                </Link>
              ) : null}
            </div>
          </div>
          <div className="absolute right-7 top-7 hidden w-[202px] rounded-lg border border-white/70 bg-white/90 p-3.5 text-slate-800 shadow-lg backdrop-blur md:block dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BadgeCheck className="size-4 text-[#e83e22]" aria-hidden="true" />
              Təsdiqli mağazalar
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Məhsul və mağazaları bir yerdə araşdırın.
            </p>
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
            <div className="grid grid-flow-col auto-cols-[122px] gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-[132px] md:grid-flow-row md:grid-cols-6 md:overflow-visible lg:grid-cols-10">
              {activeCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>
        ) : null}

        {campaignProducts.length > 0 ? (
          <section aria-label="Seçilmiş məhsul bölmələri">
            <div className="grid gap-3 md:grid-cols-3 md:gap-4">
              {campaignProducts.map((product, index) => (
                <CampaignCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </section>
        ) : null}

        {products.length > 0 ? (
          <section>
            <SectionHeader title="Yeni məhsullar" href="/products" action={productsLabel} />
            <InfiniteProductGrid
              initialProducts={products}
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

        {featuredStores.length > 0 ? (
          <section id="featured-stores">
            <SectionHeader
              title={featuredSection?.title || home("featuredStores")}
              href="/stores"
              action={home("viewAll")}
            />
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-5">
              {featuredStores.map((store, index) => (
                <div
                  key={store.id}
                  className={cn(
                    "w-[45vw] max-w-[176px] shrink-0 snap-start sm:w-[184px] sm:max-w-[184px] md:w-auto md:max-w-none",
                    index >= 5 && "hidden lg:block",
                  )}
                >
                  <HomeStoreCard store={store} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-2 border-y border-slate-200 py-4 dark:border-slate-800 md:grid-cols-4 md:py-5">
          {trustItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className={cn(
                  "flex min-w-0 gap-2.5 px-3 py-3 md:px-5",
                  index % 2 === 1 && "border-l border-slate-200 dark:border-slate-800",
                  index >= 2 && "border-t border-slate-200 dark:border-slate-800 md:border-t-0",
                  index > 0 && "md:border-l md:border-slate-200 md:dark:border-slate-800",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff0ec] text-[#e83e22] dark:bg-orange-400/10 dark:text-orange-300">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-5 text-slate-950 dark:text-slate-50">
                    {item.title}
                  </span>
                  <span className="block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </span>
                </span>
              </div>
            );
          })}
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
