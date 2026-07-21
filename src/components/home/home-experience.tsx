"use client";

import {
  ArrowRight,
  Heart,
  PackageSearch,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
} from "lucide-react";
import { m } from "framer-motion";

import { SiteFooter } from "@/components/layout/site-footer";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { HomepageSection, SiteSettings } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";

type HomeExperienceProps = {
  locale: string;
  siteSettings: SiteSettings;
  sections: HomepageSection[];
  activeTheme: string;
  stores: MarketplaceStore[];
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
      className="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-slate-900/10"
    >
      <Link href={`/${store.slug}`} className="block">
        <div className="relative bg-muted">
          <div className="h-32 overflow-hidden">
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
          <div className="absolute -bottom-7 left-4 z-10 grid size-16 place-items-center overflow-hidden rounded-lg border bg-background shadow-sm">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-black text-primary">
                {store.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="p-4 pt-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black tracking-normal">{store.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {store.productCount} məhsul
              </p>
            </div>
            <ArrowRight className="mt-1 size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          {store.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {store.description}
            </p>
          ) : null}
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
  const themeClass = themeClasses[activeTheme] ?? themeClasses.default;
  const featuredStores = stores.slice(0, visibleLimit(featuredSection, 8));
  const newStores = stores.slice(0, visibleLimit(newSection, 8));
  const totalProductCount = stores.reduce((sum, store) => sum + store.productCount, 0);
  const activeCategories = categories.slice(0, visibleLimit(categorySection, 8));

  return (
    <main className={cn("min-h-screen overflow-hidden bg-gradient-to-br", themeClass)}>
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            {siteSettings.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.siteName}
                className="size-10 rounded-lg object-cover"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
                a
              </span>
            )}
            <span className="truncate text-xl font-black tracking-normal">
              {siteSettings.shortName || siteSettings.siteName}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            <Button asChild variant="ghost">
              <Link href="/products">Məhsullar</Link>
            </Button>
            <HeaderAccountActions />
          </nav>
          <MarketplaceSearch
            stores={stores}
            categories={categories}
            className="hidden flex-1 md:flex"
          />
          <div className="ml-auto hidden items-center gap-1 md:flex">
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-[52px] rounded-lg border bg-background"
              aria-label="Favorilər"
            >
              <Link href="/favorites">
                <Heart className="size-7" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-[52px] rounded-lg border bg-background"
              aria-label="Səbət"
            >
              <Link href="/cart">
                <ShoppingCart className="size-7" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin">
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Məhsul sat
              </Link>
            </Button>
          </div>
          <Button asChild className="ml-auto md:hidden" size="sm">
            <Link href="/admin">Daxil ol</Link>
          </Button>
        </div>
      </header>

      <section className="container grid min-h-[560px] items-center gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:py-14">
        <m.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            alisveris.az marketplace
          </span>
          <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight tracking-normal text-foreground sm:text-5xl lg:text-6xl">
            {heroTitle}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
            {heroDescription}
          </p>
          <MarketplaceSearch
            stores={stores}
            categories={categories}
            className="mt-7 rounded-lg border bg-card p-2 shadow-xl shadow-slate-900/10 md:grid md:grid-cols-[1fr_auto]"
            inputClassName="h-12 border-transparent bg-background"
            buttonSize="lg"
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {activeCategories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-primary"
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
          className="relative"
        >
          <div className="absolute -left-3 top-6 z-10 rounded-lg bg-card p-3 shadow-xl">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              Təsdiqlənmiş satıcılar
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card shadow-2xl shadow-slate-900/12">
            <div className="aspect-[4/3] bg-muted">
              {hero?.imageUrl ? (
                <img
                  src={hero.imageUrl}
                  alt={heroTitle}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full grid-cols-2 gap-3 p-4">
                  {featuredStores.slice(0, 4).map((store, index) => (
                    <div
                      key={store.id}
                      className={cn(
                        "overflow-hidden rounded-lg border bg-background",
                        index === 0 ? "col-span-2" : "",
                      )}
                    >
                      {store.coverUrl || store.logoUrl ? (
                        <img
                          src={store.coverUrl || store.logoUrl || ""}
                          alt={store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Store className="size-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {featuredStores.length === 0 ? (
                    <div className="col-span-2 flex h-full items-center justify-center rounded-lg border bg-background text-muted-foreground">
                      <PackageSearch className="mr-2 size-5" />
                      Mağazalar hazır olduqda burada görünəcək
                    </div>
                  ) : null}
                </div>
              )}
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
              <p className="mt-1 text-sm text-muted-foreground">
                {categorySection?.description || "Axtardığın məhsula daha tez çat."}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">{productsLabel}</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
                  className="flex min-h-28 items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <span className="text-base font-bold">{category.name}</span>
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
              <p className="mt-1 text-sm text-muted-foreground">
                {featuredSection?.description || "Platformadakı aktiv mağazalar."}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">Hamısı</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
                {newSection?.title || "Yeni mağazalar"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {newSection?.description || "Ən son əlavə olunan aktiv mağazalar."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {newStores.map((store, index) => (
              <HomeStoreCard key={`new-${store.id}`} store={store} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="container pb-24 pt-8 md:pb-12">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Təhlükəsiz struktur", "Supabase Auth və RLS ilə qorunan data."],
              ["Mağaza paneli", "Məhsul, sifariş, müştəri və abunəlik idarəsi."],
              [
                benefitsSection?.title || "Sürətli alış",
                benefitsSection?.description || "Səbət, indi al və beh strukturu hazırdır.",
              ],
            ].map(([itemTitle, itemDescription]) => (
              <div key={itemTitle} className="rounded-lg border bg-background/70 p-4">
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold">{itemTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {itemDescription}
                </p>
              </div>
            ))}
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
