"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import { AddToCartButton } from "@/components/cart/cart-buttons";
import { EmptyState } from "@/components/common/empty-state";
import { GlobalLoader } from "@/components/common/global-loader";
import { DepositModal } from "@/components/deposits/deposit-modal";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { PublicStoreLocationSection } from "@/components/locations/public-store-location-section";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  CartProduct,
  MarketplaceProductPage,
  MarketplaceProductSort,
  MarketplaceStore,
} from "@/lib/cart/types";
import { formatAznDiscountedPrice, formatAznPrice } from "@/lib/format";
import type { StoreLocation } from "@/lib/locations/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";
import {
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Clock,
  Dumbbell,
  Home as HomeIcon,
  Laptop,
  MapPin,
  PackageSearch,
  PawPrint,
  Phone,
  Shirt,
  Sparkles,
  Star,
  Store,
  Truck,
  Utensils,
  Wrench,
  type LucideIcon,
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
  products: CartProduct[];
  nextCursor?: string | null;
  hasMore?: boolean;
  categories: CategoryOption[];
  selectedCategoryId?: string;
  locale: string;
  searchQuery?: string;
  sort?: MarketplaceProductSort;
  productCardVariant?: string;
  footer?: FooterProps;
  labels: MarketplaceLabels;
};

type StorefrontProps = {
  store: MarketplaceStore;
  categories: CategoryOption[];
  locations?: StoreLocation[];
  selectedCategoryId?: string;
  locale: string;
  productCardVariant?: string;
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

function mergeProducts(current: CartProduct[], nextProducts: CartProduct[]) {
  const seen = new Set(current.map((product) => product.id));
  const merged = [...current];

  nextProducts.forEach((product) => {
    if (!seen.has(product.id)) {
      seen.add(product.id);
      merged.push(product);
    }
  });

  return merged;
}

function ProductListLoader({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <div className="flex justify-center py-5" aria-live="polite" aria-busy="true">
      <GlobalLoader />
    </div>
  );
}

function ProductInfiniteSentinel({
  onIntersect,
  disabled,
}: {
  onIntersect: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled || !ref.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onIntersect();
        }
      },
      {
        root: null,
        rootMargin: "560px 0px",
        threshold: 0,
      },
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [disabled, onIntersect]);

  return <div ref={ref} className="h-px w-full" aria-hidden="true" />;
}

function CategoryFilters({
  categories,
  selectedCategoryId,
  baseHref,
  onSelect,
}: {
  categories: CategoryOption[];
  selectedCategoryId?: string;
  baseHref: string;
  onSelect?: (category?: CategoryOption) => void;
}) {
  if (categories.length === 0) {
    return null;
  }

  const renderFilterButton = (category?: CategoryOption) => {
    const isSelected = category ? selectedCategoryId === category.id : !selectedCategoryId;
    const label = category?.name ?? "Bütün kateqoriyalar";

    if (onSelect) {
      return (
        <Button
          key={category?.id ?? "all"}
          type="button"
          variant={isSelected ? "default" : "outline"}
          className="shrink-0 justify-start lg:w-full"
          onClick={() => onSelect(category)}
        >
          {label}
        </Button>
      );
    }

    return (
      <Button
        key={category?.id ?? "all"}
        asChild
        variant={isSelected ? "default" : "outline"}
        className="shrink-0 justify-start lg:w-full"
      >
        <Link href={category ? `${baseHref}?category=${category.slug}` : baseHref}>
          {label}
        </Link>
      </Button>
    );
  };

  return (
    <div className="max-w-full min-w-0 overflow-x-auto pb-2 lg:overflow-visible lg:pb-0">
      <div className="flex w-max min-w-full gap-2 lg:grid lg:w-full lg:min-w-0 lg:gap-2">
        {renderFilterButton()}
        {categories.map((category) => renderFilterButton(category))}
      </div>
    </div>
  );
}

const CATEGORY_ICON_STYLES = [
  "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-200 dark:ring-cyan-900/40",
  "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/40",
  "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/40",
  "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/40",
  "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-200 dark:ring-indigo-900/40",
  "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-200 dark:ring-sky-900/40",
];

const CATEGORY_ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/elektron|telefon|smart|komp|notbuk|audio|monitor|planset|tv/i, Laptop],
  [/ev|bag|bağ|meiset|məişət|mebel|dekor/i, HomeIcon],
  [/moda|geyim|ayaqqabi|ayaqqabı|şexsi|shexsi|aksesuar/i, Shirt],
  [/gozell|gözəl|baxim|baxım|kosmetik/i, Sparkles],
  [/ana|usaq|uşaq|korpə|korpe/i, Baby],
  [/idman|outdoor|eylence|əyləncə|asude/i, Dumbbell],
  [/avto|avtomobil|masin|maşın/i, Car],
  [/tikinti|alet|alət|temir|təmir/i, Wrench],
  [/ofis|deft|dəft|kitab|hobi|hobbi/i, BookOpen],
  [/heyvan|zoo|pet/i, PawPrint],
  [/qida|icki|içki|restoran|market/i, Utensils],
  [/biznes|xidmet|xidmət|sirket|şirkət/i, BriefcaseBusiness],
];

function getCategoryIcon(category: CategoryOption): LucideIcon {
  const value = `${category.slug} ${category.name}`;
  const match = CATEGORY_ICON_RULES.find(([pattern]) => pattern.test(value));

  return match?.[1] ?? PackageSearch;
}

function MobileCategoryCatalog({
  categories,
  productCounts,
  onSelect,
}: {
  categories: CategoryOption[];
  productCounts: Map<string, number>;
  onSelect: (category: CategoryOption) => void;
}) {
  if (categories.length === 0) {
    return (
      <EmptyState
        className="min-h-72 bg-background"
        title="Kateqoriya yoxdur"
        description="Aktiv kateqoriya tapılmadı."
      />
    );
  }

  return (
    <section className="md:hidden">
      <div className="grid grid-cols-3 gap-2.5">
        {categories.map((category, index) => {
          const Icon = getCategoryIcon(category);
          const iconStyle = CATEGORY_ICON_STYLES[index % CATEGORY_ICON_STYLES.length];

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category)}
              className="group flex min-h-[132px] min-w-0 touch-manipulation flex-col items-center justify-between rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200/70 transition-[transform,box-shadow,border-color] duration-200 ease-out active:scale-[0.98] dark:bg-card dark:ring-border"
            >
              <span className={cn("grid size-16 place-items-center rounded-2xl ring-1", iconStyle)}>
                <Icon className="size-8 stroke-[2.2]" aria-hidden="true" />
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-5 text-slate-600 dark:text-muted-foreground">
                  {category.name}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {productCounts.get(category.id) ?? 0} məhsul
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ProductGrid({
  products,
  depositEnabled,
  storeSlug,
  storeName,
  productCardVariant,
  labels,
}: {
  products: CartProduct[];
  depositEnabled: boolean;
  storeSlug?: string;
  storeName?: string;
  productCardVariant?: string;
  labels: Pick<MarketplaceLabels, "stock">;
}) {
  const router = useRouter();
  const isLiquidGlass = productCardVariant === "liquid-glass";

  if (products.length === 0) {
    return (
      <EmptyState
        className="min-h-80"
        title="Bu mağazada məhsul yoxdur"
        description="Seçilən kateqoriya üzrə aktiv məhsul tapılmadı."
      />
    );
  }

  const now = Date.now();

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
          now - createdTime < 14 * 24 * 60 * 60 * 1000;

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
          className={cn(
            "group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-200 ease-out [contain:layout_paint_style] [content-visibility:auto] [contain-intrinsic-size:340px] hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hover:shadow-md",
            isLiquidGlass &&
              "liquid-glass-product-card border-white/70 bg-white/60 hover:border-cyan-200/80 dark:border-white/10 dark:bg-white/10",
          )}
        >
          <Link
            href={detailHref}
            className="block"
            aria-label={`${product.name} məhsul detalına keç`}
            scroll
          >
            <div
              className={cn(
                "relative aspect-[4/3] overflow-hidden bg-white",
                isLiquidGlass && "liquid-glass-product-image-shell",
              )}
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    "h-full w-full object-contain p-1.5 transition-transform duration-200 ease-out motion-reduce:transition-none sm:p-2 md:group-hover:scale-[1.025]",
                  )}
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
            </div>
          </Link>
          <FavoriteToggleButton
            productId={product.id}
            productName={product.name}
            compact
            className="absolute right-2 top-2 z-20 size-9 border-white/70 bg-white/95 text-slate-900 shadow-sm"
          />
          <div className="relative z-0 flex min-w-0 flex-1 flex-col p-2.5 sm:p-3">
            <div className="mb-1.5 hidden min-w-0 text-xs text-muted-foreground sm:block">
              {displayStoreName ? (
                <span className="block min-w-0 truncate">{displayStoreName}</span>
              ) : (
                <span>Mağaza</span>
              )}
            </div>
            <h2
              className={cn(
                "line-clamp-2 min-h-9 break-words text-[13px] font-semibold leading-[18px] tracking-normal text-slate-950 group-hover:text-primary dark:text-foreground sm:min-h-10 sm:text-sm sm:leading-5",
                isLiquidGlass && "font-black group-hover:text-cyan-700 dark:group-hover:text-cyan-200",
              )}
            >
              {product.name}
            </h2>
            <div className="mt-1.5 flex items-center gap-0.5 text-amber-400 sm:gap-1" aria-label="Rəy yoxdur">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} className="size-3 sm:size-3.5" aria-hidden="true" />
              ))}
              <span className="ml-1 text-xs text-muted-foreground">(0)</span>
            </div>
            <div className="mt-1.5 min-w-0 sm:mt-2">
              <p className="truncate text-base font-black text-[hsl(var(--marketplace-navy))] dark:text-foreground sm:text-lg">
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
                "mt-1.5 inline-flex w-fit max-w-full rounded-md px-2 py-0.5 text-[11px] font-medium sm:mt-2 sm:py-1 sm:text-xs",
                isOutOfStock
                  ? "bg-rose-500/10 text-rose-600"
                  : "bg-emerald-500/10 text-emerald-600",
              )}
            >
              <span className="truncate">
                {isOutOfStock ? "Stokda yoxdur" : `${labels.stock}: ${product.stockQuantity}`}
              </span>
            </p>
            <p className="mt-2 hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <Truck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              Çatdırılma mağaza ilə
            </p>
            <div className="relative z-10 mt-auto grid gap-2 pt-3">
              <DepositModal
                product={product}
                enabled={depositEnabled && !isOutOfStock}
                className="hidden h-9 w-full px-2 text-xs md:inline-flex"
              />
              <AddToCartButton
                product={product}
                disabled={isOutOfStock}
                className={cn(
                  "h-10 w-full rounded-lg border-0 bg-[hsl(var(--marketplace-primary-soft))] px-2 text-[13px] font-black uppercase text-[hsl(var(--marketplace-primary))] shadow-none transition duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--marketplace-primary)/0.16)] hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 sm:border sm:bg-background sm:text-sm sm:font-medium sm:normal-case sm:text-foreground sm:hover:bg-accent",
                  isLiquidGlass &&
                    "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/25 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 sm:border-0 sm:text-white",
                )}
              />
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}

function useInfiniteProducts({
  initialProducts,
  initialCursor,
  initialHasMore,
  locale,
  categoryId,
  storeId,
  searchQuery,
  sort,
}: {
  initialProducts: CartProduct[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  locale: string;
  categoryId?: string;
  storeId?: string;
  searchQuery?: string;
  sort?: MarketplaceProductSort;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [cursor, setCursor] = useState(initialCursor ?? null);
  const [hasMore, setHasMore] = useState(Boolean(initialHasMore));
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(false);
  const queryKey = useMemo(
    () => [locale, categoryId ?? "", storeId ?? "", searchQuery ?? "", sort ?? "newest"].join("|"),
    [categoryId, locale, searchQuery, sort, storeId],
  );

  useEffect(() => {
    abortRef.current?.abort();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!mountedRef.current) {
      mountedRef.current = true;
      setProducts(initialProducts);
      setCursor(initialCursor ?? null);
      setHasMore(Boolean(initialHasMore));
      setIsLoadingNext(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoadingNext(true);

    const params = new URLSearchParams({
      locale,
      limit: "20",
      sort: sort ?? "newest",
    });

    if (categoryId) {
      params.set("categoryId", categoryId);
    }

    if (storeId) {
      params.set("storeId", storeId);
    }

    if (searchQuery?.trim()) {
      params.set("q", searchQuery.trim());
    }

    fetch(`/api/marketplace/products?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("PRODUCT_PAGE_FAILED");
        }

        return response.json() as Promise<MarketplaceProductPage>;
      })
      .then((page) => {
        if (requestRef.current !== requestId || controller.signal.aborted) {
          return;
        }

        setProducts(page.products);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setProducts([]);
          setCursor(null);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (requestRef.current === requestId) {
          setIsLoadingNext(false);
        }
      });
  }, [initialCursor, initialHasMore, initialProducts, queryKey]);

  const loadNext = useCallback(async () => {
    if (isLoadingNext || !hasMore || !cursor) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsLoadingNext(true);

    const params = new URLSearchParams({
      locale,
      limit: "20",
      cursor,
      sort: sort ?? "newest",
    });

    if (categoryId) {
      params.set("categoryId", categoryId);
    }

    if (storeId) {
      params.set("storeId", storeId);
    }

    if (searchQuery?.trim()) {
      params.set("q", searchQuery.trim());
    }

    try {
      const response = await fetch(`/api/marketplace/products?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("PRODUCT_PAGE_FAILED");
      }

      const page = (await response.json()) as MarketplaceProductPage;

      if (requestRef.current !== requestId || controller.signal.aborted) {
        return;
      }

      setProducts((current) => mergeProducts(current, page.products));
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setHasMore(false);
      }
    } finally {
      if (requestRef.current === requestId) {
        setIsLoadingNext(false);
      }
    }
  }, [categoryId, cursor, hasMore, isLoadingNext, locale, searchQuery, sort, storeId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    products,
    hasMore,
    isLoadingNext,
    loadNext,
  };
}

export function ProductInfiniteGrid({
  products,
  hasMore,
  isLoadingNext,
  onLoadNext,
  depositEnabled,
  storeSlug,
  storeName,
  productCardVariant,
  labels,
}: {
  products: CartProduct[];
  hasMore: boolean;
  isLoadingNext: boolean;
  onLoadNext: () => void;
  depositEnabled: boolean;
  storeSlug?: string;
  storeName?: string;
  productCardVariant?: string;
  labels: Pick<MarketplaceLabels, "stock">;
}) {
  return (
    <>
      <ProductGrid
        products={products}
        depositEnabled={depositEnabled}
        storeSlug={storeSlug}
        storeName={storeName}
        productCardVariant={productCardVariant}
        labels={labels}
      />
      <ProductInfiniteSentinel
        disabled={!hasMore || isLoadingNext}
        onIntersect={onLoadNext}
      />
      <ProductListLoader show={isLoadingNext} />
    </>
  );
}

export function InfiniteProductGrid({
  initialProducts,
  initialCursor,
  initialHasMore,
  locale,
  categoryId,
  storeId,
  searchQuery,
  sort = "newest",
  depositEnabled,
  storeSlug,
  storeName,
  productCardVariant,
  labels,
}: {
  initialProducts: CartProduct[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  locale: string;
  categoryId?: string;
  storeId?: string;
  searchQuery?: string;
  sort?: MarketplaceProductSort;
  depositEnabled: boolean;
  storeSlug?: string;
  storeName?: string;
  productCardVariant?: string;
  labels: Pick<MarketplaceLabels, "stock">;
}) {
  const infinite = useInfiniteProducts({
    initialProducts,
    initialCursor,
    initialHasMore,
    locale,
    categoryId,
    storeId,
    searchQuery,
    sort,
  });

  return (
    <ProductInfiniteGrid
      products={infinite.products}
      hasMore={infinite.hasMore}
      isLoadingNext={infinite.isLoadingNext}
      onLoadNext={infinite.loadNext}
      depositEnabled={depositEnabled}
      storeSlug={storeSlug}
      storeName={storeName}
      productCardVariant={productCardVariant}
      labels={labels}
    />
  );
}

export function ProductMarketplace({
  products,
  nextCursor,
  hasMore,
  categories,
  selectedCategoryId,
  locale,
  searchQuery,
  sort = "newest",
  productCardVariant,
  footer,
  labels,
}: ProductMarketplaceProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategoryId);
  const infinite = useInfiniteProducts({
    initialProducts: products,
    initialCursor: nextCursor,
    initialHasMore: hasMore,
    locale,
    categoryId: activeCategoryId,
    searchQuery,
    sort,
  });
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId),
    [activeCategoryId, categories],
  );
  const categoryProductCounts = useMemo(() => {
    const counts = new Map<string, number>();

    infinite.products.forEach((product) => {
      if (product.categoryId) {
        counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
      }
    });

    return counts;
  }, [infinite.products]);
  const visibleProducts = infinite.products;

  useEffect(() => {
    setActiveCategoryId(selectedCategoryId);
  }, [selectedCategoryId]);

  function selectCategory(category?: CategoryOption) {
    setActiveCategoryId(category?.id);

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (category) {
      url.searchParams.set("category", category.slug);
    } else {
      url.searchParams.delete("category");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="container max-w-full py-5 md:py-8">
        <header className="mb-6 hidden min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:flex md:p-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-normal">Bütün məhsullar</h1>
          </div>
          <span className="rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground">
            {visibleProducts.length} məhsul
          </span>
        </header>

        <div className="md:hidden">
          {activeCategoryId ? (
            <section className="space-y-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl px-3 text-sm"
                  onClick={() => selectCategory()}
                >
                  Bütün kateqoriyalar
                </Button>
                <span className="shrink-0 rounded-xl border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {visibleProducts.length} məhsul
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-normal">
                {activeCategory?.name ?? "Kateqoriya məhsulları"}
              </h1>
              {visibleProducts.length === 0 ? (
                <EmptyState
                  className="min-h-72 bg-background"
                  title={labels.emptyTitle}
                  description={labels.emptyDescription}
                />
              ) : (
                <>
                  <ProductInfiniteGrid
                    products={visibleProducts}
                    hasMore={infinite.hasMore}
                    isLoadingNext={infinite.isLoadingNext}
                    onLoadNext={infinite.loadNext}
                    depositEnabled={false}
                    productCardVariant={productCardVariant}
                    labels={{ stock: labels.stock }}
                  />
                </>
              )}
            </section>
          ) : (
            <section className="space-y-5">
              <MobileCategoryCatalog
                categories={categories}
                productCounts={categoryProductCounts}
                onSelect={selectCategory}
              />
              <ProductInfiniteGrid
                products={visibleProducts}
                hasMore={infinite.hasMore}
                isLoadingNext={infinite.isLoadingNext}
                onLoadNext={infinite.loadNext}
                depositEnabled={false}
                productCardVariant={productCardVariant}
                labels={{ stock: labels.stock }}
              />
            </section>
          )}
        </div>

        <div className="hidden min-w-0 items-start gap-5 md:grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <CategoryFilters
              categories={categories}
              selectedCategoryId={activeCategoryId}
              baseHref="/products"
              onSelect={selectCategory}
            />
          </aside>
          {visibleProducts.length === 0 ? (
            <EmptyState
              className="min-h-96"
              title={labels.emptyTitle}
              description={labels.emptyDescription}
            />
          ) : (
            <>
              <ProductInfiniteGrid
                products={visibleProducts}
                hasMore={infinite.hasMore}
                isLoadingNext={infinite.isLoadingNext}
                onLoadNext={infinite.loadNext}
                depositEnabled={false}
                productCardVariant={productCardVariant}
                labels={{ stock: labels.stock }}
              />
            </>
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
  locale,
  productCardVariant,
  depositEnabled,
  footer,
  labels,
}: StorefrontProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategoryId);
  const infinite = useInfiniteProducts({
    initialProducts: store.sampleProducts,
    initialCursor: store.productNextCursor,
    initialHasMore: store.productHasMore,
    locale,
    categoryId: activeCategoryId,
    storeId: store.id,
  });
  const primaryLocation = useMemo(
    () => locations.find((location) => location.isActive) ?? locations[0] ?? null,
    [locations],
  );
  const primaryAddress =
    primaryLocation && primaryLocation.showAddress
      ? [primaryLocation.city, primaryLocation.district, primaryLocation.address]
          .filter(Boolean)
          .join(", ")
      : store.address;
  const visibleProducts = infinite.products;

  function selectCategory(category?: CategoryOption) {
    setActiveCategoryId(category?.id);

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (category) {
      url.searchParams.set("category", category.slug);
    } else {
      url.searchParams.delete("category");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

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
                  {primaryAddress ? (
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">{primaryAddress}</span>
                    </span>
                  ) : null}
                  {primaryLocation?.workingHours ? (
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">
                        {primaryLocation.workingHours}
                      </span>
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
                selectedCategoryId={activeCategoryId}
                baseHref={`/${store.slug}`}
                onSelect={selectCategory}
              />
            </aside>
            <div className="min-w-0">
              <ProductInfiniteGrid
                products={visibleProducts}
                hasMore={infinite.hasMore}
                isLoadingNext={infinite.isLoadingNext}
                onLoadNext={infinite.loadNext}
                depositEnabled={depositEnabled}
                storeSlug={store.slug}
                storeName={store.name}
                productCardVariant={productCardVariant}
                labels={{ stock: labels.stock }}
              />
            </div>
          </div>
        </section>
      </div>
      <SiteFooter {...footer} />
    </main>
  );
}
