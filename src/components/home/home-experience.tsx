"use client";

import {
  ArrowRight,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { m } from "framer-motion";

import { ProductGrid } from "@/components/cart/product-marketplace";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import type { HomepageSection, SiteSettings } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";

type HomeExperienceProps = {
  locale: string;
  siteSettings: SiteSettings;
  sections: HomepageSection[];
  activeTheme: string;
  stores: MarketplaceStore[];
  products: CartProduct[];
  depositEnabled: boolean;
  categories: CategoryOption[];
  title: string;
  description: string;
  productsLabel: string;
};

const themeClasses: Record<string, string> = {
  default: "from-background via-muted/50 to-background",
  "modern-marketplace": "from-cyan-50 via-background to-amber-50 dark:from-slate-950 dark:via-background dark:to-cyan-950/30",
  "luxury-commerce": "from-stone-50 via-background to-yellow-50 dark:from-zinc-950 dark:via-background dark:to-yellow-950/20",
  "minimal-storefront": "from-background via-background to-muted/50",
  "bold-catalog": "from-rose-50 via-background to-cyan-50 dark:from-rose-950/20 dark:via-background dark:to-cyan-950/20",
};

function sectionByKey(sections: HomepageSection[], key: string) {
  return sections.find((section) => section.key === key);
}

function visibleLimit(section: HomepageSection | undefined, fallback: number) {
  return section?.itemLimit && section.itemLimit > 0 ? section.itemLimit : fallback;
}

function HomeStoreCard({ store, index }: { store: MarketplaceStore; index: number }) {
  return (
    <m.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.28 }}
      className="group h-full min-w-0 overflow-hidden rounded-md border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-slate-900/10"
    >
      <Link href={`/${store.slug}`} className="block h-full min-w-0">
        <div className="relative bg-muted">
          <div className="h-20 overflow-hidden sm:h-24">
            {store.coverUrl ? (
              <img
                src={store.coverUrl}
                alt={store.name}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Store className="size-8 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-5 left-3 z-10 grid size-12 place-items-center overflow-hidden rounded-md border bg-background shadow-sm sm:size-14">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-black text-primary">
                {store.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex min-h-[96px] flex-col justify-between p-3 pt-7 sm:min-h-[132px] sm:p-4 sm:pt-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 break-words text-sm font-black tracking-normal sm:text-base">
                {store.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {store.productCount} məhsul
              </p>
            </div>
            <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary sm:size-5" />
          </div>
        </div>
      </Link>
    </m.article>
  );
}

export function HomeExperience({
  locale,
  siteSettings,
  sections,
  activeTheme,
  stores,
  products,
  depositEnabled,
  categories,
  title,
  description,
  productsLabel,
}: HomeExperienceProps) {
  void locale;
  const hero = sectionByKey(sections, "hero");
  const categorySection = sectionByKey(sections, "categories");
  const featuredSection = sectionByKey(sections, "featured_products");
  const newSection = sectionByKey(sections, "new_products");
  const benefitsSection = sectionByKey(sections, "benefits");
  const heroTitle = hero?.title || title;
  const heroDescription = hero?.description || description;
  const heroShowTitle = hero?.showTitle ?? true;
  const heroShowDescription = hero?.showDescription ?? true;
  const themeClass = themeClasses[activeTheme] ?? themeClasses.default;
  const alphabeticalStores = [...stores].sort((a, b) =>
    a.name.localeCompare(b.name, "az"),
  );
  const featuredStores = alphabeticalStores.slice(0, visibleLimit(featuredSection, 8));
  const newStores = alphabeticalStores;
  const totalProductCount = stores.reduce((sum, store) => sum + store.productCount, 0);
  const activeCategories = categories.slice(0, visibleLimit(categorySection, 8));

  return (
    <main
      className={cn(
        "min-h-screen w-full max-w-full overflow-x-clip bg-gradient-to-br pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0",
        themeClass,
      )}
    >
      <section className="container grid items-center gap-8 py-8 lg:min-h-[560px] lg:grid-cols-[1.08fr_0.92fr] lg:py-14">
        <m.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="min-w-0 max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            Alışveriş marketplace
          </span>
          <h1 className="mt-5 max-w-2xl break-words text-[clamp(2.5rem,8vw,4rem)] font-black leading-tight tracking-normal text-foreground lg:text-6xl">
            {heroTitle}
          </h1>
          <MarketplaceSearch
            stores={stores}
            categories={categories}
            className="mt-7 rounded-lg border bg-card p-2 shadow-xl shadow-slate-900/10 md:grid md:grid-cols-[1fr_auto]"
            inputClassName="h-12 border-transparent bg-background"
            buttonSize="lg"
            stackOnMobile
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {activeCategories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="max-w-full rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <div className="overflow-hidden rounded-lg border bg-card shadow-2xl shadow-slate-900/12">
            <div className="relative aspect-[4/3] bg-muted">
              {hero?.imageUrl ? (
                <img
                  src={hero.imageUrl}
                  alt={heroTitle}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.10),hsl(var(--accent)/0.12))]" />
              )}
              <div
                className={cn(
                  "absolute inset-0 grid place-items-center p-8 text-center",
                  hero?.imageUrl && "bg-background/68 backdrop-blur-[1px]",
                )}
              >
                  <div className="max-w-sm">
                    <div className="mx-auto grid size-16 place-items-center rounded-lg border border-primary/20 bg-background/80 text-primary shadow-sm">
                      <Store className="size-8" aria-hidden="true" />
                    </div>
                    {heroShowTitle ? (
                      <h2 className="mt-5 text-2xl font-black tracking-normal">
                        {heroTitle}
                      </h2>
                    ) : null}
                    {heroShowDescription ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {heroDescription}
                      </p>
                    ) : null}
                  </div>
                </div>
            </div>
          </div>
          <div className="absolute -bottom-5 right-5 rounded-lg bg-primary p-4 text-primary-foreground shadow-xl">
            <p className="text-sm opacity-90">Aktiv məhsul</p>
            <p className="text-3xl font-black">{totalProductCount}</p>
          </div>
        </m.div>
      </section>

      {activeCategories.length > 0 ? (
        <section className="container py-6 md:py-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">
                {categorySection?.title || "Kateqoriyalar"}
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">Bütün kateqoriyalar</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {activeCategories.map((category, index) => (
              <m.div
                key={category.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.26 }}
              >
                <Link
                  href={`/products?category=${category.slug}`}
                className="flex min-h-20 items-center justify-between rounded-lg border bg-card px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:min-h-24 sm:p-4"
                >
                  <span className="line-clamp-2 min-w-0 break-words text-sm font-bold sm:text-base">{category.name}</span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </m.div>
            ))}
          </div>
        </section>
      ) : null}

      {featuredStores.length > 0 ? (
        <section className="container py-6 md:py-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">
                {featuredSection?.title || "Seçilmiş mağazalar"}
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">Hamısı</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featuredStores.map((store, index) => (
              <HomeStoreCard key={store.id} store={store} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      {newStores.length > 0 ? (
        <section className="container py-6 md:py-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">
                {newSection?.title || "Mağazalar"}
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {newStores.map((store, index) => (
              <HomeStoreCard key={`new-${store.id}`} store={store} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      {products.length > 0 ? (
        <section className="container py-6 md:py-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black">Məhsullar</h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">{productsLabel}</Link>
            </Button>
          </div>
          <ProductGrid
            products={products}
            depositEnabled={depositEnabled}
            labels={{ stock: "Stok" }}
          />
        </section>
      ) : null}

      <section className="hidden md:block">
        <div className="container pb-12 pt-8">
        <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Təhlükəsiz struktur",
              "Mağaza paneli",
              benefitsSection?.title || "Sürətli alış",
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
