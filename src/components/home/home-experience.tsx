"use client";

import type { CSSProperties } from "react";
import {
  ArrowRight,
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Dumbbell,
  Hammer,
  Home,
  Leaf,
  Package,
  PawPrint,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  Utensils,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { InfiniteProductGrid } from "@/components/cart/product-marketplace";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { Link } from "@/i18n/navigation";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import type { HomepageSection, SiteSettings } from "@/lib/cms/types";
import { getStorePath } from "@/lib/config/domains";
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
  title: string;
  description: string;
  productsLabel: string;
};

const DEFAULT_MARKETPLACE_BANNER_URL = "/auth/auth-banner.png";
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

const homeDesignStyle: CSSProperties & Record<string, string> = {
  "--background": "210 40% 98%",
  "--foreground": "222 47% 11%",
  "--card": "0 0% 100%",
  "--card-foreground": "222 47% 11%",
  "--muted": "210 40% 96%",
  "--muted-foreground": "215 16% 47%",
  "--border": "214 32% 91%",
  "--input": "214 32% 91%",
  "--primary": "221 83% 53%",
  "--primary-foreground": "0 0% 100%",
  "--ring": "221 83% 53%",
  "--marketplace-primary": "221 83% 53%",
  "--marketplace-primary-hover": "224 76% 48%",
  "--marketplace-primary-hover-foreground": "0 0% 100%",
  "--marketplace-primary-soft": "214 100% 97%",
  "--marketplace-navy": "222 47% 11%",
  "--marketplace-muted": "215 16% 47%",
} as const;

const trustItems = [
  {
    icon: Package,
    title: "Geniş seçim",
    description: "Minlərlə məhsul",
  },
  {
    icon: Store,
    title: "Mağazalar",
    description: "Fərqli satıcılar",
  },
  {
    icon: ShieldCheck,
    title: "Rahat alış-veriş",
    description: "Sadə və aydın proses",
  },
  {
    icon: Truck,
    title: "Çatdırılma",
    description: "Mağaza şərtlərinə görə",
  },
];

function getCategoryIcon(category: CategoryOption) {
  const value = `${category.slug} ${category.name}`.toLocaleLowerCase("az-AZ");

  if (value.includes("elektron")) {
    return Smartphone;
  }

  if (value.includes("ev") || value.includes("bag") || value.includes("bağ")) {
    return value.includes("heyvan") ? PawPrint : Home;
  }

  if (value.includes("moda") || value.includes("geyim")) {
    return Shirt;
  }

  if (value.includes("gozell") || value.includes("gözəll") || value.includes("baxim") || value.includes("baxım")) {
    return Sparkles;
  }

  if (value.includes("usaq") || value.includes("uşaq")) {
    return Baby;
  }

  if (value.includes("idman") || value.includes("outdoor")) {
    return Dumbbell;
  }

  if (value.includes("avto") || value.includes("masin") || value.includes("maşın")) {
    return Car;
  }

  if (value.includes("tikinti") || value.includes("alet") || value.includes("alət")) {
    return Hammer;
  }

  if (value.includes("kitab")) {
    return BookOpen;
  }

  if (value.includes("qida") || value.includes("icki") || value.includes("içki")) {
    return Utensils;
  }

  if (value.includes("ofis") || value.includes("defter") || value.includes("dəftər")) {
    return BriefcaseBusiness;
  }

  if (value.includes("bag") || value.includes("bağ")) {
    return Leaf;
  }

  return Package;
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
  return (
    <div className="mb-4 flex items-center justify-between gap-4 md:mb-6">
      <h2 className="text-2xl font-semibold leading-tight tracking-normal text-slate-950 dark:text-slate-50 md:text-[28px]">
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
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:text-blue-300 dark:hover:text-blue-200"
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
      className="group flex min-h-[112px] min-w-0 flex-col justify-between rounded-[14px] border border-slate-200 bg-white p-4 text-slate-950 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 sm:min-h-[145px] sm:p-5 md:hover:-translate-y-0.5 md:hover:border-slate-300 md:hover:shadow-[0_8px_30px_rgba(15,23,42,0.07)] md:dark:hover:border-slate-700"
    >
      <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600 transition dark:bg-blue-400/10 dark:text-blue-300 sm:size-11">
        <CategoryIcon className="size-5 stroke-[2.1] sm:size-6" aria-hidden="true" />
      </span>
      <span className="mt-4 flex min-w-0 items-end justify-between gap-3 sm:mt-5">
        <span className="min-w-0 break-words text-[15px] font-semibold leading-5 sm:line-clamp-2 sm:text-base">
          {category.name}
        </span>
        <ArrowRight className="size-4 shrink-0 text-slate-400 transition md:group-hover:translate-x-0.5 md:group-hover:text-blue-600" />
      </span>
    </Link>
  );
}

function HomeStoreCard({ store }: { store: MarketplaceStore }) {
  const marketplace = useTranslations("marketplace");
  const coverUrl = store.coverUrl || store.sampleProducts[0]?.imageUrl || null;

  return (
    <article className="group h-full min-w-0 rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 dark:border-slate-800 dark:bg-slate-900 md:rounded-2xl md:hover:-translate-y-0.5 md:hover:border-slate-300 md:hover:shadow-[0_8px_30px_rgba(15,23,42,0.07)] md:dark:hover:border-slate-700">
      <Link href={getStorePath(store.slug)} className="relative block h-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
        <div className="relative">
          <div className="aspect-[16/9] overflow-hidden rounded-t-[14px] bg-slate-100 dark:bg-slate-800 md:aspect-[16/7] md:rounded-t-2xl">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={store.name}
                className="h-full w-full object-cover transition duration-200 md:group-hover:scale-[1.015]"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#f1f5f9,#e2e8f0)] dark:bg-[linear-gradient(135deg,#1e293b,#0f172a)]">
                <span className="text-4xl font-semibold text-slate-400 dark:text-slate-600">
                  {store.name.slice(0, 1).toLocaleUpperCase("az-AZ")}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/24 to-transparent" />
          </div>
          <div className="absolute -bottom-7 left-4 z-10 grid size-14 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white text-lg font-semibold text-blue-600 shadow-md shadow-slate-950/10 dark:border-slate-900 dark:bg-slate-900 dark:text-blue-300 md:-bottom-8 md:size-16 md:text-xl">
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
        <div className="flex min-h-[112px] flex-col justify-between px-4 pb-4 pt-10 md:min-h-[126px] md:pt-12">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 break-words text-[15px] font-semibold leading-5 tracking-normal text-slate-950 dark:text-slate-50 sm:text-base">
                {store.name}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {marketplace("productCount", { count: store.productCount })}
              </p>
            </div>
            <ArrowRight className="mt-1 hidden size-4 text-slate-400 transition sm:size-5 md:block md:group-hover:translate-x-0.5 md:group-hover:text-blue-600" />
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
  title,
  description,
  productsLabel,
}: HomeExperienceProps) {
  const home = useTranslations("home");
  const hero = sectionByKey(sections, "hero");
  const categorySection = sectionByKey(sections, "categories");
  const featuredSection = sectionByKey(sections, "featured_products");
  const heroImageUrl = hero?.imageUrl.trim() || DEFAULT_MARKETPLACE_BANNER_URL;
  const mobileHeroImageUrl = stringSetting(hero, "mobileImageUrl");
  const heroShowTitle = hero?.showTitle ?? true;
  const heroShowDescription = hero?.showDescription ?? true;
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
  const activeCategories = categories.slice(0, visibleLimit(categorySection, 14));
  const heroPills = activeCategories.slice(0, 4);
  const heroEyebrow = "Alış-verişin yeni ünvanı";
  const heroTitle = normalizeHeroTitle(hero?.title || title);
  const shouldUseDefaultHeroCopy = heroTitle === DEFAULT_HERO_TITLE;
  const displayHeroTitle = shouldUseDefaultHeroCopy
    ? "Axtardığın hər şey,\nbir ünvanda."
    : heroTitle;
  const displayHeroDescription =
    shouldUseDefaultHeroCopy
      ? "Minlərlə məhsul və etibarlı mağazalar arasında asanlıqla axtar, müqayisə et və alış-veriş et."
      : hero?.description || description;

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 px-4 pb-[calc(90px+env(safe-area-inset-bottom))] pt-4 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-6 md:pb-10 md:pt-8 lg:px-8 lg:pt-12"
      data-homepage-preset={siteSettings.design.homepagePreset}
      style={homeDesignStyle}
    >
      <div className="mx-auto w-full max-w-[1280px] space-y-10 md:space-y-20">
        <section className="relative z-20 overflow-visible rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_62%,#ffffff_100%)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_54%,#020617_100%)] md:rounded-[20px]">
          <div className="grid gap-6 p-5 sm:p-6 md:p-8 lg:min-h-[420px] lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-center lg:gap-8 lg:p-10 xl:p-12">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-400/10 dark:text-blue-200 dark:ring-blue-400/20">
                {heroEyebrow}
              </span>
              {heroShowTitle ? (
                <h1 className="mt-4 max-w-[12ch] whitespace-pre-line text-[2.2rem] font-bold leading-[1.07] tracking-normal text-slate-950 dark:text-white min-[390px]:text-[2.35rem] sm:text-[3rem] lg:mt-5 lg:text-[3.35rem]">
                  {displayHeroTitle}
                </h1>
              ) : null}
              {heroShowDescription ? (
                <p className="mt-4 max-w-xl text-[15px] leading-6 text-slate-600 dark:text-slate-300 md:mt-5 md:text-base md:leading-7">
                  {displayHeroDescription}
                </p>
              ) : null}
              <div data-home-search-sentinel className="h-px w-full" aria-hidden="true" />
              <MarketplaceSearch
                stores={stores}
                className="mt-6 max-w-[560px] rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.07)] dark:border-slate-700 dark:bg-slate-900 md:mt-8 md:rounded-[14px] md:p-1.5 md:shadow-[0_14px_35px_rgba(15,23,42,0.08)]"
                inputClassName="h-[50px] rounded-xl border-transparent bg-transparent pl-11 text-[16px] text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 dark:text-slate-50 md:h-[52px] md:pl-12"
                buttonClassName="!size-[46px] !min-w-[46px] rounded-[10px] bg-blue-600 p-0 text-white hover:bg-blue-700"
                buttonSize="lg"
                stackOnMobile
                compactActions
                placeholder="Məhsul, brend və ya mağaza axtar..."
              />
              {heroPills.length > 0 ? (
                <div className="-mx-5 mt-5 flex max-w-[calc(100%+2.5rem)] items-center gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:max-w-full md:flex-wrap md:gap-2.5 md:overflow-visible md:px-0">
                  <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
                    Populyar axtarışlar:
                  </span>
                  {heroPills.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.slug}`}
                      className="inline-flex h-9 shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400/40 dark:hover:text-blue-200 md:h-auto md:py-1.5 md:text-sm"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative hidden min-h-[260px] overflow-hidden rounded-2xl border border-white/70 bg-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-slate-700 lg:block lg:min-h-[340px]">
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt={shouldUseDefaultHeroCopy ? "Alışveriş marketplace" : heroTitle}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    mobileHeroImageUrl && "hidden md:block",
                  )}
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                />
              ) : null}
              {mobileHeroImageUrl ? (
                <img
                  src={mobileHeroImageUrl}
                  alt={shouldUseDefaultHeroCopy ? "Alışveriş marketplace" : heroTitle}
                  className="absolute inset-0 h-full w-full object-cover md:hidden"
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                />
              ) : null}
              <div className="absolute inset-0 bg-slate-950/24" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/70 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/14 bg-white/12 p-4 text-white backdrop-blur-md">
                <p className="text-sm font-medium text-white/75">Marketplace</p>
                <p className="mt-1 text-lg font-semibold">Mağaza və məhsulları bir yerdə kəşf et</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 py-1 dark:border-slate-800 md:border-y md:border-slate-200 md:py-6 lg:grid-cols-4 lg:gap-4">
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex min-w-0 items-start gap-2.5 rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 md:rounded-none md:bg-transparent md:p-0 md:ring-0 lg:border-r lg:border-slate-200 lg:last:border-r-0 dark:lg:border-slate-800">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-blue-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-blue-300 dark:ring-slate-800 md:size-10 md:bg-white md:dark:bg-slate-900">
                  <Icon className="size-4 md:size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-slate-950 dark:text-slate-50 md:text-[15px]">
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
              title="Kateqoriyaları kəşf et"
              mobileTitle="Kateqoriyalar"
              href="/categories"
              action="Hamısına bax"
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
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
              action="Hamısına bax"
            />
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4">
              {featuredStores.map((store, index) => (
                <div
                  key={store.id}
                  className={cn(
                    "w-[78vw] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none",
                    index >= 4 && "hidden lg:block",
                  )}
                >
                  <HomeStoreCard store={store} />
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
              labels={{ stock: "Stok" }}
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
