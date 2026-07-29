"use client";

import { AddToCartButton, BuyNowButton } from "@/components/cart/cart-buttons";
import { EmptyState } from "@/components/common/empty-state";
import { DepositModal } from "@/components/deposits/deposit-modal";
import { MarketplaceHeader } from "@/components/layout/marketplace-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import { formatAznDiscountedPrice } from "@/lib/format";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  MapPin,
  PackageSearch,
  Phone,
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
  searchQuery?: string;
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
    <div className="max-w-full min-w-0 overflow-x-auto pb-2 lg:overflow-visible lg:pb-0">
      <div className="flex w-max min-w-full gap-2 lg:grid lg:w-full lg:min-w-0 lg:gap-2">
      <Button
        asChild
        variant={!selectedCategoryId ? "default" : "outline"}
        className="shrink-0 justify-start lg:w-full"
      >
        <Link href={baseHref}>Bütün kateqoriyalar</Link>
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          asChild
          variant={selectedCategoryId === category.id ? "default" : "outline"}
          className="shrink-0 justify-start lg:w-full"
        >
          <Link href={`${baseHref}?category=${category.slug}`}>{category.name}</Link>
        </Button>
      ))}
      </div>
    </div>
  );
}

function StoreCard({ store }: { store: MarketplaceStore }) {
  const previewImages = store.sampleProducts
    .map((product) => product.imageUrl)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <article className="group min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-slate-900/10">
      <Link href={`/${store.slug}`} className="block min-w-0">
        <div className="relative bg-muted">
          <div className="h-24 overflow-hidden sm:h-28">
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
          </div>
          <div className="absolute -bottom-7 left-4 z-10">
            <StoreLogo store={store} className="size-16 shadow-sm" />
          </div>
        </div>
        <div className="p-3 pt-9 sm:p-4 sm:pt-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-2 break-words text-base font-black tracking-normal sm:text-lg">
                {store.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {store.productCount} məhsul
              </p>
            </div>
            <ArrowRight className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </div>
          {store.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {store.description}
            </p>
          ) : null}
          {store.address ? (
            <p className="mt-3 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="line-clamp-1 min-w-0">{store.address}</span>
            </p>
          ) : null}
          {previewImages.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
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
        title="Bu mağazada məhsul yoxdur"
        description="Seçilən kateqoriya üzrə aktiv məhsul tapılmadı."
      />
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => {
        const isOutOfStock = product.stockQuantity <= 0;

        return (
        <article
          key={product.id}
          className="group relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-slate-900/10"
        >
          <Link
            href={`/${storeSlug}/products/${product.slug}`}
            className="absolute inset-0 z-0"
            aria-label={`${product.name} məhsul detalına keç`}
          />
          <div className="relative z-0">
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
          </div>
          <div className="relative z-0 flex min-w-0 flex-1 flex-col p-3">
            <h2 className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5 tracking-normal group-hover:text-primary">
              {product.name}
            </h2>
            <p className="mt-2 truncate text-base font-bold">
              {formatAznDiscountedPrice(product.priceAmount, product.discountAmount)}
            </p>
            <p
              className={cn(
                "mt-1 inline-flex w-fit max-w-full rounded-md px-2 py-1 text-xs font-medium",
                isOutOfStock
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              <span className="truncate">
                {isOutOfStock ? "Stokda yoxdur" : `${labels.stock}: ${product.stockQuantity}`}
              </span>
            </p>
            <div className="relative z-10 mt-4 grid gap-2">
              <DepositModal
                product={product}
                enabled={depositEnabled && !isOutOfStock}
                className="w-full px-2 text-xs sm:text-sm"
              />
              <BuyNowButton
                product={product}
                disabled={isOutOfStock}
                className="w-full px-2 text-xs sm:text-sm"
              />
              <AddToCartButton
                product={product}
                disabled={isOutOfStock}
                className="w-full px-2 text-xs sm:text-sm"
              />
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}

export function ProductMarketplace({
  stores,
  categories,
  selectedCategoryId,
  searchQuery,
  footer,
  labels,
}: ProductMarketplaceProps) {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <MarketplaceHeader
        siteName={footer?.siteName}
        stores={stores}
        categories={categories}
        searchDefaultValue={searchQuery}
        showMobileSearch
      />
      <div className="container max-w-full py-6 md:py-8">
        <header className="mb-6 flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-normal">Mağazalar</h1>
          </div>
          <span className="rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground">
            {stores.length} aktiv mağaza
          </span>
        </header>

        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
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
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <MarketplaceHeader
        siteName={footer?.siteName}
        stores={[store]}
        categories={categories}
      />
      <div className="container max-w-full py-5 md:py-6">
        <nav className="mb-4 flex min-w-0 items-center overflow-hidden text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-primary">
            Mağazalar
          </Link>
          <span className="mx-2">·</span>
          <span className="min-w-0 truncate font-medium text-foreground">{store.name}</span>
        </nav>

        <section className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="relative h-36 overflow-hidden bg-primary/10 sm:h-44 lg:h-56">
            {store.coverUrl ? (
              <img
                src={store.coverUrl}
                alt={store.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(var(--accent)/0.18))] text-primary">
                <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-background/75 px-4 py-3 shadow-sm backdrop-blur">
                  <Store className="size-5" aria-hidden="true" />
                  <span className="max-w-[220px] truncate text-sm font-semibold">
                    {store.name}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-4 translate-y-1/2 md:left-8">
              <StoreLogo store={store} className="size-20 shadow-sm sm:size-24" />
            </div>
          </div>
          <div className="grid min-w-0 gap-6 p-4 pt-12 md:grid-cols-[minmax(0,1fr)_260px] md:p-8 md:pt-14">
            <div className="flex min-w-0 gap-4">
              <div className="min-w-0">
                <h1 className="line-clamp-2 break-words text-2xl font-black tracking-normal md:text-3xl">
                  {store.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {store.productCount} məhsul
                </p>
                {store.description ? (
                  <p className="mt-4 max-w-2xl break-words text-sm leading-6 text-foreground">
                    {store.description}
                  </p>
                ) : null}
                <div className="mt-4 flex min-w-0 flex-wrap gap-4 text-sm text-muted-foreground">
                  {store.address ? (
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">{store.address}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="grid min-w-0 content-start gap-3">
              {store.phone ? (
                <Button asChild className="w-full min-w-0">
                  <a href={`tel:${store.phone.replace(/\s/g, "")}`}>
                    <Phone className="mr-2 size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">Nömrəni göstər</span>
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 min-w-0 rounded-lg bg-card p-4 shadow-sm md:p-8">
          <div className="mb-6 min-w-0">
            <h2 className="break-words text-xl font-black tracking-normal">
              {store.name} təklifləri ({store.productCount})
            </h2>
          </div>
          <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
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
