"use client";

import type { CSSProperties } from "react";
import {
  ArrowRight,
  PackageSearch,
  ShieldCheck,
  Store,
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
import type { CategoryOption } from "@/lib/products/types";
import { formatAznPrice } from "@/lib/format";
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
    backgroundColor: colors.pageBackground,
    color: colors.text,
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

function HomeStoreCard({ store }: { store: MarketplaceStore }) {
  const marketplace = useTranslations("marketplace");

  return (
    <article className="group h-full min-w-0 overflow-hidden rounded-md border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-slate-900/10">
      <Link href={`/${store.slug}`} className="block h-full min-w-0">
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
  const common = useTranslations("common");
  const home = useTranslations("home");
  const marketplace = useTranslations("marketplace");
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
  const totalProductCount = stores.reduce((sum, store) => sum + store.productCount, 0);
  const activeCategories = categories.slice(0, visibleLimit(categorySection, 8));
  const featuredProduct = products[0];

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-clip pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0"
      data-homepage-preset={siteSettings.design.homepagePreset}
      style={themeStyle}
    >
      <section className="border-b py-4 md:py-6" style={{ backgroundColor: "var(--home-hero-bg)" }}>
        <div className="container grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)_236px]">
          <aside className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-black">{home("categories")}</h2>
              <Link href="/products" className="text-xs font-semibold text-primary hover:underline">
                {home("allCategories")}
              </Link>
            </div>
            <div className="space-y-1">
              {activeCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                >
                  <span className="truncate">{category.name}</span>
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-3">
            <MarketplaceSearch
              stores={stores}
              categories={categories}
              className="rounded-lg border bg-card p-1.5 shadow-sm md:grid md:grid-cols-[1fr_auto]"
              inputClassName="h-10 border-transparent bg-background"
              stackOnMobile
            />
            <article className="relative min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm">
              <div className="relative aspect-[2.25/1] min-h-[190px] bg-muted sm:min-h-[240px]">
                {hero?.imageUrl ? (
                  <img src={hero.imageUrl} alt={heroTitle} className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--accent)/0.12))]" />
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-background/85 via-background/20 to-transparent p-4 sm:p-6">
                  <div className="max-w-xl">
                    {heroShowTitle ? <h1 className="text-2xl font-black tracking-normal sm:text-3xl">{heroTitle}</h1> : null}
                    {heroShowDescription ? <p className="mt-1 max-w-lg text-sm text-muted-foreground">{heroDescription}</p> : null}
                  </div>
                  <div className="ml-auto hidden rounded-md bg-primary px-3 py-2 text-primary-foreground sm:block">
                    <p className="text-[11px] opacity-80">{home("activeProducts")}</p>
                    <p className="text-xl font-black">{totalProductCount}</p>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {featuredStores[0] ? (
              <Link href={`/${featuredStores[0].slug}`} className="group min-w-0 rounded-lg border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md">
                <p className="text-xs font-semibold text-muted-foreground">{home("featuredStores")}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
                    {featuredStores[0].logoUrl ? <img src={featuredStores[0].logoUrl} alt={featuredStores[0].name} className="h-full w-full object-contain p-1" /> : <Store className="size-5 text-primary" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black group-hover:text-primary">{featuredStores[0].name}</span>
                    <span className="block text-xs text-muted-foreground">{home("activeProducts")}: {featuredStores[0].productCount}</span>
                  </span>
                </div>
              </Link>
            ) : null}
            {featuredProduct ? (
              <Link href={featuredProduct.storeSlug ? `/${featuredProduct.storeSlug}/products/${featuredProduct.slug}` : "/products"} className="group min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md">
                <div className="aspect-[2/1] bg-muted">
                  {featuredProduct.imageUrl ? <img src={featuredProduct.imageUrl} alt={featuredProduct.name} className="h-full w-full object-contain p-2" /> : <PackageSearch className="mx-auto mt-8 size-7 text-muted-foreground" aria-hidden="true" />}
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">{common("products")}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold group-hover:text-primary">{featuredProduct.name}</p>
                  <p className="mt-1 text-sm font-black">{formatAznPrice(featuredProduct.priceAmount)}</p>
                </div>
              </Link>
            ) : null}
          </aside>
        </div>
      </section>

      {products.length > 0 ? (
        <section
          className="py-6 md:py-10"
          style={{ backgroundColor: "var(--home-products-bg)" }}
        >
          <div className="container">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">{common("products")}</h2>
            </div>
            <Button asChild variant="outline">
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
            labels={{ stock: marketplace("stock") }}
          />
          </div>
        </section>
      ) : null}

      {featuredStores.length > 0 ? (
        <section
          className="py-6 md:py-10"
          style={{ backgroundColor: "var(--home-stores-bg)" }}
        >
          <div className="container">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">
                {featuredSection?.title || home("featuredStores")}
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">{home("allStores")}</Link>
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

      <section
        className="hidden md:block"
        style={{ backgroundColor: "var(--home-benefits-bg)" }}
      >
        <div className="container pb-12 pt-8">
        <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              home("secureStructure"),
              home("storePanel"),
              benefitsSection?.title || home("quickShopping"),
            ].map((itemTitle) => (
              <div key={itemTitle} className="rounded-lg border bg-background/70 p-4">
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold">{itemTitle}</h3>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>
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
