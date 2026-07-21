"use client";

import { AddToCartButton, BuyNowButton } from "@/components/cart/cart-buttons";
import { EmptyState } from "@/components/common/empty-state";
import { DepositModal } from "@/components/deposits/deposit-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Clock,
  Heart,
  MapPin,
  PackageSearch,
  Phone,
  Search,
  ShoppingCart,
  Store,
} from "lucide-react";

type MarketplaceLabels = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  stock: string;
  cart: string;
};

type ProductMarketplaceProps = {
  stores: MarketplaceStore[];
  categories: CategoryOption[];
  selectedCategoryId?: string;
  footer?: FooterProps;
  labels: MarketplaceLabels;
};

type StorefrontProps = {
  store: MarketplaceStore;
  categories: CategoryOption[];
  selectedCategoryId?: string;
  depositEnabled: boolean;
  footer?: FooterProps;
  labels: MarketplaceLabels;
};

type FooterProps = {
  siteName?: string;
  description?: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
  };
};

function formatMoney(product: CartProduct) {
  const value = Math.max(product.priceAmount - product.discountAmount, 0);

  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

function MarketplaceHeader({ cartLabel }: { cartLabel: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="container flex h-16 items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
            a
          </span>
          <span className="text-xl font-black tracking-normal">alisveris.az</span>
        </Link>
        <form action="/products" className="hidden flex-1 md:block" method="get">
          <label className="relative block">
            <span className="sr-only">Axtarış</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="premium-input h-11 w-full pl-9 pr-3 text-sm"
              name="q"
              placeholder="Mağaza, məhsul və kateqoriya axtar"
              type="search"
            />
          </label>
        </form>
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="size-11 rounded-lg border bg-background"
          aria-label="Favorilər"
        >
          <Link href="/dashboard/favorites">
            <Heart className="size-6" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="ghost" className="hidden md:inline-flex">
          <Link href="/admin">Daxil ol</Link>
        </Button>
        <Button asChild variant="outline" className="hidden md:inline-flex">
          <Link href="/register">Qeydiyyatdan keç</Link>
        </Button>
        <Button asChild>
          <Link href="/cart">
            <ShoppingCart className="mr-2 size-5" aria-hidden="true" />
            {cartLabel}
          </Link>
        </Button>
      </div>
    </header>
  );
}

function StoreLogo({ store, className }: { store: MarketplaceStore; className?: string }) {
  return store.logoUrl ? (
    <img
      src={store.logoUrl}
      alt={store.name}
      className={cn("rounded-lg border bg-background object-cover", className)}
    />
  ) : (
    <span
      className={cn(
        "grid place-items-center rounded-lg border bg-background text-2xl font-black text-primary",
        className,
      )}
    >
      {store.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function CategoryFilters({
  categories,
  selectedCategoryId,
  baseHref,
}: {
  categories: CategoryOption[];
  selectedCategoryId?: string;
  baseHref: string;
}) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
      <Button asChild variant={!selectedCategoryId ? "default" : "outline"}>
        <Link href={baseHref}>Bütün kateqoriyalar</Link>
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          asChild
          variant={selectedCategoryId === category.id ? "default" : "outline"}
        >
          <Link href={`${baseHref}?category=${category.slug}`}>{category.name}</Link>
        </Button>
      ))}
    </div>
  );
}

function StoreCard({ store }: { store: MarketplaceStore }) {
  const previewImages = store.sampleProducts
    .map((product) => product.imageUrl)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <article className="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-slate-900/10">
      <Link href={`/${store.slug}`} className="block">
        <div className="relative h-32 overflow-hidden bg-muted">
          {store.coverUrl ? (
            <img
              src={store.coverUrl}
              alt={store.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Store className="size-8" aria-hidden="true" />
            </div>
          )}
          <div className="absolute -bottom-7 left-4">
            <StoreLogo store={store} className="size-16 shadow-sm" />
          </div>
        </div>
        <div className="p-4 pt-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-normal">{store.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {store.productCount} elan
              </p>
            </div>
            <ArrowRight className="mt-1 size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          {store.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {store.description}
            </p>
          ) : null}
          {store.address ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              <span className="line-clamp-1">{store.address}</span>
            </p>
          ) : null}
          {previewImages.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {previewImages.map((imageUrl, index) => (
                <div
                  key={`${store.id}-${imageUrl}-${index}`}
                  className="aspect-square overflow-hidden rounded-md bg-muted"
                >
                  <img src={imageUrl ?? ""} alt={store.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({
  products,
  depositEnabled,
  storeSlug,
  labels,
}: {
  products: CartProduct[];
  depositEnabled: boolean;
  storeSlug: string;
  labels: Pick<MarketplaceLabels, "stock">;
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        className="min-h-80"
        title="Bu mağazada elan yoxdur"
        description="Seçilən kateqoriya üzrə aktiv məhsul tapılmadı."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <article
          key={product.id}
          className="group flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-slate-900/10"
        >
          <Link href={`/${storeSlug}/products/${product.id}`} className="block">
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <PackageSearch className="size-8" aria-hidden="true" />
                </div>
              )}
            </div>
          </Link>
          <div className="flex flex-1 flex-col p-3">
            <Link href={`/${storeSlug}/products/${product.id}`}>
              <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 tracking-normal hover:text-primary">
                {product.name}
              </h2>
            </Link>
            <p className="mt-2 text-base font-bold">{formatMoney(product)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {labels.stock}: {product.stockQuantity}
            </p>
            <div className="mt-4 grid gap-2">
              <DepositModal product={product} enabled={depositEnabled} />
              <BuyNowButton product={product} />
              <AddToCartButton product={product} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ProductMarketplace({
  stores,
  categories,
  selectedCategoryId,
  footer,
  labels,
}: ProductMarketplaceProps) {
  return (
    <main className="min-h-screen bg-muted/40">
      <MarketplaceHeader cartLabel={labels.cart} />
      <div className="container py-8">
        <header className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-normal">Mağazalar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {labels.description}
            </p>
          </div>
          <span className="rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground">
            {stores.length} aktiv mağaza
          </span>
        </header>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <CategoryFilters
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              baseHref="/products"
            />
          </aside>
          {stores.length === 0 ? (
            <EmptyState
              className="min-h-96"
              title={labels.emptyTitle}
              description={labels.emptyDescription}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </div>
      </div>
      <SiteFooter {...footer} />
    </main>
  );
}

export function Storefront({
  store,
  categories,
  selectedCategoryId,
  depositEnabled,
  footer,
  labels,
}: StorefrontProps) {
  return (
    <main className="min-h-screen bg-muted/40">
      <MarketplaceHeader cartLabel={labels.cart} />
      <div className="container py-6">
        <nav className="mb-5 text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-primary">
            Mağazalar
          </Link>
          <span className="mx-2">·</span>
          <span className="font-medium text-foreground">{store.name}</span>
        </nav>

        <section className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="flex min-h-56 items-center justify-center bg-background">
            {store.coverUrl ? (
              <img
                src={store.coverUrl}
                alt={store.name}
                className="h-56 w-full object-cover"
              />
            ) : (
              <div className="grid h-56 w-full place-items-center">
                <StoreLogo store={store} className="size-28" />
              </div>
            )}
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_260px] md:p-8">
            <div className="flex gap-4">
              <StoreLogo store={store} className="size-24 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-normal">{store.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {store.productCount} elan
                </p>
                {store.description ? (
                  <p className="mt-5 max-w-2xl text-sm leading-6 text-foreground">
                    {store.description}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {store.address ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-4 text-primary" aria-hidden="true" />
                      {store.address}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-2">
                    <Clock className="size-4" aria-hidden="true" />
                    Açıqdır
                  </span>
                </div>
              </div>
            </div>
            <div className="grid content-start gap-3">
              {store.phone ? (
                <Button asChild>
                  <a href={`tel:${store.phone.replace(/\s/g, "")}`}>
                    <Phone className="mr-2 size-4" aria-hidden="true" />
                    Nömrəni göstər
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg bg-card p-5 shadow-sm md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-black tracking-normal">
              {store.name} təklifləri ({store.productCount})
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <CategoryFilters
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                baseHref={`/${store.slug}`}
              />
            </aside>
            <ProductGrid
              products={store.sampleProducts}
              depositEnabled={depositEnabled}
              storeSlug={store.slug}
              labels={{ stock: labels.stock }}
            />
          </div>
        </section>
      </div>
      <SiteFooter {...footer} />
    </main>
  );
}
