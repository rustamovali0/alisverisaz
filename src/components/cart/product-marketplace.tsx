"use client";

import type { MouseEvent } from "react";

import { AddToCartButton, BuyNowButton } from "@/components/cart/cart-buttons";
import { EmptyState } from "@/components/common/empty-state";
import { DepositModal } from "@/components/deposits/deposit-modal";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { PublicStoreLocationSection } from "@/components/locations/public-store-location-section";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import { formatAznDiscountedPrice, formatAznPrice } from "@/lib/format";
import type { StoreLocation } from "@/lib/locations/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Eye,
  GitCompare,
  MapPin,
  PackageSearch,
  Phone,
  Star,
  Store,
  Truck,
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
  locations?: StoreLocation[];
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
  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-md border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-slate-900/10">
      <Link href={`/${store.slug}`} className="block min-w-0">
        <div className="border-b bg-muted/60 p-2.5">
          <div className="grid h-24 place-items-center overflow-hidden rounded-md bg-background sm:h-28">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="h-full w-full object-contain p-3"
                loading="lazy"
              />
            ) : (
              <StoreLogo store={store} className="size-12 shadow-sm sm:size-14" />
            )}
          </div>
        </div>
        <div className="flex min-h-[76px] flex-col justify-between p-3 sm:min-h-[88px] sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-2 break-words text-sm font-black tracking-normal sm:text-base">
                {store.name}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {store.productCount} məhsul
              </p>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary sm:size-5" />
          </div>
          {store.address ? (
            <p className="mt-2 hidden min-w-0 items-center gap-2 text-xs text-muted-foreground sm:mt-3 sm:flex sm:text-sm">
              <MapPin className="size-3.5 shrink-0 text-primary sm:size-4" aria-hidden="true" />
              <span className="line-clamp-1 min-w-0">{store.address}</span>
            </p>
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
  storeName,
  labels,
}: {
  products: CartProduct[];
  depositEnabled: boolean;
  storeSlug?: string;
  storeName?: string;
  labels: Pick<MarketplaceLabels, "stock">;
}) {
  const router = useRouter();

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
    <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => {
        const isOutOfStock = product.stockQuantity <= 0;
        const hasDiscount = product.discountAmount > 0;
        const discountPercent =
          hasDiscount && product.priceAmount > 0
            ? Math.round((product.discountAmount / product.priceAmount) * 100)
            : 0;
        const displayStoreName = storeName ?? product.storeName ?? null;
        const detailStoreSlug = storeSlug ?? product.storeSlug ?? "";
        const detailHref = detailStoreSlug
          ? `/${detailStoreSlug}/products/${product.slug}`
          : "/products";
        const createdTime = product.createdAt ? new Date(product.createdAt).getTime() : 0;
        const isNewProduct =
          Number.isFinite(createdTime) &&
          createdTime > 0 &&
          Date.now() - createdTime < 14 * 24 * 60 * 60 * 1000;

        function openDetail(event: MouseEvent<HTMLElement>) {
          const target = event.target as HTMLElement;

          if (target.closest("a,button,input,textarea,select,[role='button']")) {
            return;
          }

          router.push(detailHref, { scroll: true });
        }

        return (
        <article
          key={product.id}
          role="link"
          tabIndex={0}
          onClick={openDetail}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              router.push(detailHref, { scroll: true });
            }
          }}
          className="group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Link
            href={detailHref}
            className="block"
            aria-label={`${product.name} məhsul detalına keç`}
            scroll
          >
            <div className="relative aspect-square overflow-hidden bg-white">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <PackageSearch className="size-8" aria-hidden="true" />
                </div>
              )}
              <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                {hasDiscount ? (
                  <span className="rounded-full bg-rose-500 px-2 py-1 text-[11px] font-black text-white">
                    -{discountPercent}%
                  </span>
                ) : null}
                {isNewProduct ? (
                  <span className="rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-black text-white">
                    Yeni
                  </span>
                ) : null}
              </div>
              <div className="absolute bottom-2 left-2 right-2 hidden translate-y-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 sm:flex">
                <Button asChild size="sm" className="h-9 w-full rounded-lg shadow-md">
                  <Link href={detailHref}>
                    <Eye className="mr-2 size-4" aria-hidden="true" />
                    Quick View
                  </Link>
                </Button>
              </div>
            </div>
          </Link>
          <FavoriteToggleButton
            productId={product.id}
            productName={product.name}
            compact
            className="absolute right-2 top-2 z-20 size-9 border-white/70 bg-white/95 text-slate-900 shadow-md"
          />
          <div className="relative z-0 flex min-w-0 flex-1 flex-col p-3">
            <div className="mb-2 flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
              {displayStoreName ? (
                <span className="min-w-0 truncate">{displayStoreName}</span>
              ) : (
                <span>Mağaza</span>
              )}
              <button
                type="button"
                className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background text-muted-foreground transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-sm"
                aria-label="Müqayisəyə əlavə et"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <GitCompare className="size-4" aria-hidden="true" />
              </button>
            </div>
            <h2 className="line-clamp-2 min-h-10 break-words text-sm font-semibold leading-5 tracking-normal text-slate-950 group-hover:text-primary dark:text-foreground">
              {product.name}
            </h2>
            <div className="mt-2 flex items-center gap-1 text-amber-400" aria-label="Rəy yoxdur">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} className="size-3.5" aria-hidden="true" />
              ))}
              <span className="ml-1 text-xs text-muted-foreground">(0)</span>
            </div>
            <div className="mt-2 min-w-0">
              <p className="truncate text-lg font-black text-[hsl(var(--marketplace-navy))] dark:text-foreground">
                {formatAznDiscountedPrice(product.priceAmount, product.discountAmount)}
              </p>
              {hasDiscount ? (
                <p className="truncate text-sm font-medium text-muted-foreground line-through">
                  {formatAznPrice(product.priceAmount)}
                </p>
              ) : null}
            </div>
            <p
              className={cn(
                "mt-2 inline-flex w-fit max-w-full rounded-md px-2 py-1 text-xs font-medium",
                isOutOfStock
                  ? "bg-rose-500/10 text-rose-600"
                  : "bg-emerald-500/10 text-emerald-600",
              )}
            >
              <span className="truncate">
                {isOutOfStock ? "Stokda yoxdur" : `${labels.stock}: ${product.stockQuantity}`}
              </span>
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Truck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              Çatdırılma mağaza ilə
            </p>
            <div className="relative z-10 mt-auto grid gap-2 pt-4">
              <DepositModal
                product={product}
                enabled={depositEnabled && !isOutOfStock}
                className="hidden w-full px-2 text-xs sm:inline-flex sm:text-sm"
              />
              <BuyNowButton
                product={product}
                disabled={isOutOfStock}
                className="hidden w-full px-2 text-xs sm:inline-flex sm:text-sm"
              />
              <AddToCartButton
                product={product}
                disabled={isOutOfStock}
                className="h-11 w-full rounded-lg border-0 bg-[hsl(var(--marketplace-primary-soft))] px-2 text-[13px] font-black uppercase text-[hsl(var(--marketplace-primary))] shadow-none transition duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--marketplace-primary)/0.16)] hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 sm:border sm:bg-background sm:text-sm sm:font-medium sm:normal-case sm:text-foreground sm:hover:bg-accent"
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
  footer,
  labels,
}: ProductMarketplaceProps) {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="container max-w-full py-5 md:py-8">
        <header className="mb-6 hidden min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:flex md:p-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-normal">Mağazalar</h1>
          </div>
          <span className="rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground">
            {stores.length} aktiv mağaza
          </span>
        </header>

        <section className="md:hidden">
          <div className="mb-4 flex min-w-0 items-end justify-between gap-3">
            <h1 className="min-w-0 text-2xl font-black tracking-normal">
              Kateqoriyalar
            </h1>
          </div>
          {categories.length === 0 ? (
            <EmptyState
              className="min-h-60"
              title="Kateqoriya tapılmadı"
              description="Hazırda aktiv kateqoriya yoxdur."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="flex min-h-[92px] min-w-0 items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:text-primary"
                >
                  <span className="line-clamp-2 min-w-0 break-words text-sm font-bold">
                    {category.name}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="hidden min-w-0 items-start gap-5 md:grid lg:grid-cols-[240px_minmax(0,1fr)]">
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
            <div className="grid min-w-0 grid-cols-2 items-stretch gap-3 xl:grid-cols-3">
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
  locations = [],
  selectedCategoryId,
  depositEnabled,
  footer,
  labels,
}: StorefrontProps) {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="container max-w-full py-5 md:py-6">
        <nav className="mb-4 flex min-w-0 items-center overflow-hidden text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-primary">
            Mağazalar
          </Link>
          <span className="mx-2">·</span>
          <span className="min-w-0 truncate font-medium text-foreground">{store.name}</span>
        </nav>

        <section className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="relative h-36 bg-primary/10 sm:h-44 lg:h-56">
            {store.coverUrl ? (
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={store.coverUrl}
                  alt={store.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="absolute inset-0 grid h-full w-full place-items-center overflow-hidden bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(var(--accent)/0.18))] text-primary">
                <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-background/75 px-4 py-3 shadow-sm backdrop-blur">
                  <Store className="size-5" aria-hidden="true" />
                  <span className="max-w-[220px] truncate text-sm font-semibold">
                    {store.name}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-4 z-20 translate-y-1/2 md:left-8">
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

        <PublicStoreLocationSection locations={locations} />

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
              storeName={store.name}
              labels={{ stock: labels.stock }}
            />
          </div>
        </section>
      </div>
      <SiteFooter {...footer} />
    </main>
  );
}
