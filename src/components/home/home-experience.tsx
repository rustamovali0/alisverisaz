"use client";

import type { CSSProperties } from "react";
import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { InfiniteProductGrid } from "@/components/cart/product-marketplace";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import {
  defaultHomeThemeColors,
  homeThemeColorPresets,
} from "@/lib/cms/defaults";
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

type HomeThemeColors = Record<keyof typeof defaultHomeThemeColors, string>;

function getThemeDefaults(themeKey: string): HomeThemeColors {
  const preset = (homeThemeColorPresets as Record<string, Partial<HomeThemeColors>>)[
    themeKey
  ];

  return {
    ...defaultHomeThemeColors,
    ...preset,
  };
}

function readHomeThemeColors(
  themeKey: string,
  themeConfig: Record<string, unknown> | undefined,
): HomeThemeColors {
  const defaults = getThemeDefaults(themeKey);
  const colors =
    themeConfig?.colors &&
    typeof themeConfig.colors === "object" &&
    !Array.isArray(themeConfig.colors)
      ? (themeConfig.colors as Record<string, unknown>)
      : {};
  const nextColors = { ...defaults };

  for (const key of Object.keys(defaults) as Array<keyof HomeThemeColors>) {
    if (typeof colors[key] === "string") {
      nextColors[key] = colors[key];
    }
  }

  return nextColors;
}

function hexToHslTriplet(hex: string, fallback: string) {
  const normalized = hex.trim().replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((item) => item + item)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return fallback;
  }

  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    h =
      max === r
        ? (g - b) / delta + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function createHomeThemeStyle(
  colors: HomeThemeColors,
): CSSProperties & Record<string, string> {
  return {
    backgroundColor: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    "--background": hexToHslTriplet(colors.pageBackground, "0 0% 100%"),
    "--foreground": hexToHslTriplet(colors.text, "222 47% 11%"),
    "--card": hexToHslTriplet(colors.cardBackground, "0 0% 100%"),
    "--card-foreground": hexToHslTriplet(colors.text, "222 47% 11%"),
    "--muted": hexToHslTriplet(colors.productsBackground, "210 40% 96%"),
    "--muted-foreground": hexToHslTriplet(colors.mutedText, "215 16% 47%"),
    "--border": hexToHslTriplet(colors.border, "214 32% 91%"),
    "--primary": hexToHslTriplet(colors.primary, "187 92% 32%"),
    "--primary-foreground": hexToHslTriplet(colors.buttonText, "0 0% 100%"),
    "--accent": hexToHslTriplet(colors.accent, "38 92% 50%"),
    "--home-hero-bg": colors.heroBackground,
    "--home-categories-bg": colors.categoriesBackground,
    "--home-stores-bg": colors.storesBackground,
    "--home-products-bg": colors.productsBackground,
    "--home-benefits-bg": colors.benefitsBackground,
    "--home-button-bg": colors.buttonBackground,
    "--home-button-text": colors.buttonText,
    "--home-border": colors.border,
    "--marketplace-primary": hexToHslTriplet(colors.primary, "187 92% 32%"),
    "--marketplace-primary-hover": hexToHslTriplet(colors.buttonBackground, "187 92% 28%"),
    "--marketplace-primary-soft": hexToHslTriplet(colors.primary, "187 92% 90%"),
    "--marketplace-navy": hexToHslTriplet(colors.text, "222 47% 11%"),
    "--marketplace-muted": hexToHslTriplet(colors.mutedText, "215 16% 47%"),
  };
}

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

function HomeStoreCard({ store }: { store: MarketplaceStore }) {
  const marketplace = useTranslations("marketplace");

  return (
    <article className="group h-full min-w-0 overflow-hidden rounded-md border bg-card shadow-sm transition-[border-color,box-shadow] [contain:layout_paint_style] [content-visibility:auto] [contain-intrinsic-size:240px] hover:border-primary/40 hover:shadow-md hover:shadow-slate-900/10">
      <Link href={getStorePath(store.slug)} className="block h-full min-w-0">
        <div className="border-b bg-muted/60 p-2.5">
          <div className="grid h-28 place-items-center overflow-hidden rounded-md bg-background sm:h-32 lg:h-36">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="h-full w-full object-contain p-3.5"
                loading="lazy"
              />
            ) : (
              <span className="grid size-14 place-items-center rounded-md border bg-muted text-xl font-black text-primary sm:size-16 sm:text-2xl">
                {store.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex min-h-[86px] flex-col justify-between p-3.5 sm:min-h-[96px] sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 break-words text-sm font-black tracking-normal sm:text-base">
                {store.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {marketplace("productCount", { count: store.productCount })}
              </p>
            </div>
            <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary sm:size-5" />
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
  const benefitsSection = sectionByKey(sections, "benefits");
  const heroTitle = hero?.title || title;
  const heroDescription = hero?.description || description;
  const heroShowTitle = hero?.showTitle ?? true;
  const heroShowDescription = hero?.showDescription ?? true;
  const themeColors = readHomeThemeColors(activeTheme, themeConfig);
  const themeStyle = createHomeThemeStyle(themeColors);
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
  const activeCategories = categories.slice(0, visibleLimit(categorySection, 8));
  const heroImageUrl = hero?.imageUrl.trim();
  const mobileHeroImageUrl = stringSetting(hero, "mobileImageUrl");
  const heroPills = activeCategories.slice(0, 5);

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-clip bg-[#e9f6f2] px-0 py-3 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-8 md:pb-8 lg:py-12"
      data-homepage-preset={siteSettings.design.homepagePreset}
      style={{ ...themeStyle, backgroundColor: "#e9f6f2" }}
    >
      <div className="mx-auto w-full max-w-[1220px] overflow-hidden bg-background shadow-xl shadow-teal-950/10 sm:rounded-lg">
        <section className="px-4 pb-4 pt-5 sm:px-6 sm:pb-6 lg:px-7 lg:pt-7">
          <div className="relative overflow-hidden rounded-lg bg-[linear-gradient(135deg,#0f766e,#0f172a)]">
            <div className="absolute inset-0">
              {heroImageUrl ? (
                <img
                  src={heroImageUrl}
                  alt={heroTitle}
                  className={cn(
                    "h-full w-full object-cover",
                    mobileHeroImageUrl && "hidden md:block",
                  )}
                  loading="eager"
                  decoding="async"
                />
              ) : null}
              {mobileHeroImageUrl ? (
                <img
                  src={mobileHeroImageUrl}
                  alt={heroTitle}
                  className="h-full w-full object-cover md:hidden"
                  loading="eager"
                  decoding="async"
                />
              ) : null}
              <div className="absolute inset-0 bg-slate-950/48" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.66),rgba(15,23,42,0.38),rgba(2,6,23,0.58))]" />
            </div>
            <div className="relative z-10 mx-auto flex min-h-[330px] max-w-4xl flex-col items-center justify-center px-4 py-10 text-center text-white sm:min-h-[360px] sm:px-8 lg:min-h-[390px]">
              {heroShowTitle ? (
                <h1 className="max-w-4xl break-words text-[clamp(2rem,6vw,3.25rem)] font-black leading-tight tracking-normal drop-shadow-[0_3px_18px_rgba(0,0,0,0.45)]">
                  {heroTitle}
                </h1>
              ) : null}
              {heroShowDescription ? (
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/92 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-base">
                  {heroDescription}
                </p>
              ) : null}
              <div data-home-search-sentinel className="h-px w-full" aria-hidden="true" />
              <MarketplaceSearch
                stores={stores}
                className="mt-7 max-w-3xl rounded-full bg-white p-1.5 shadow-2xl shadow-black/25"
                inputClassName="h-12 rounded-full border-transparent bg-transparent pl-11 text-slate-900 placeholder:text-slate-500 focus-visible:ring-0"
                buttonClassName="!size-11 !min-w-11 rounded-full bg-cyan-400 p-0 text-white hover:bg-cyan-500"
                buttonSize="lg"
                stackOnMobile
                compactActions
              />
              {heroPills.length > 0 ? (
                <div className="mt-4 flex max-w-full flex-wrap justify-center gap-2">
                  {heroPills.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.slug}`}
                      className="max-w-full rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-white hover:text-primary"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {activeCategories.length > 0 ? (
          <section
            data-home-categories
            className="px-4 py-5 sm:px-6 lg:px-7"
            style={{ backgroundColor: "var(--home-categories-bg)" }}
          >
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">
                    {categorySection?.title || home("categories")}
                  </h2>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="h-9 rounded-full px-4 text-xs font-bold sm:text-sm"
                >
                  <Link href="/categories">{home("allCategories")}</Link>
                </Button>
              </div>
              <div className="grid max-w-full grid-flow-col grid-rows-2 gap-2 overflow-x-auto pb-2 [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
                {activeCategories.map((category) => (
                  <div key={category.id} className="shrink-0">
                    <Link
                      href={`/products?category=${category.slug}`}
                      className="flex h-11 min-w-40 items-center justify-between gap-3 rounded-full border bg-card px-4 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:shadow-md md:min-w-36"
                    >
                      <span className="min-w-0 truncate">{category.name}</span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {featuredStores.length > 0 ? (
          <section
            id="featured-stores"
            className="px-4 py-5 sm:px-6 lg:px-7"
            style={{ backgroundColor: "var(--home-stores-bg)" }}
          >
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">
                    {featuredSection?.title || home("featuredStores")}
                  </h2>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="h-9 rounded-full px-4 text-xs font-bold sm:text-sm"
                >
                  <Link href="/stores">{home("allStores")}</Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {featuredStores.map((store, index) => (
                  <div key={store.id} className={cn(index >= 4 && "hidden md:block")}>
                    <HomeStoreCard store={store} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {products.length > 0 ? (
          <section
            className="px-4 py-5 sm:px-6 lg:px-7"
            style={{ backgroundColor: "var(--home-products-bg)" }}
          >
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">
                    {home("recentlyListed")}
                  </h2>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="h-9 rounded-full px-4 text-xs font-bold sm:text-sm"
                >
                  <Link href="/products">{productsLabel}</Link>
                </Button>
              </div>
              <InfiniteProductGrid
                initialProducts={products}
                initialCursor={productNextCursor}
                initialHasMore={productHasMore}
                locale={locale}
                sort="newest"
                productCardVariant={productCardVariant}
                labels={{ stock: "Stok" }}
              />
            </div>
          </section>
        ) : null}

        <section
          className="hidden md:block"
          style={{ backgroundColor: "var(--home-benefits-bg)" }}
        >
          <div className="px-4 pb-8 pt-5 sm:px-6 lg:px-7">
            <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  home("secureStructure"),
                  home("storePanel"),
                  benefitsSection?.title || home("quickShopping"),
                ].map((itemTitle) => (
                  <div
                    key={itemTitle}
                    className="rounded-lg border bg-background/70 p-4"
                  >
                    <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-bold">{itemTitle}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter
        siteName={siteSettings.shortName || siteSettings.siteName}
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
