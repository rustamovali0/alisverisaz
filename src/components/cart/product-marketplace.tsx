"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useTranslations } from "next-intl";

import { AddToCartButton } from "@/components/cart/cart-buttons";
import { EmptyState } from "@/components/common/empty-state";
import { GlobalLoader } from "@/components/common/global-loader";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { PublicStoreLocationSection } from "@/components/locations/public-store-location-section";
import { StoreBrandingQuickEdit } from "@/components/store/store-branding-quick-edit";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  CartProduct,
  MarketplaceProductPage,
  MarketplaceProductSort,
  MarketplaceStore,
} from "@/lib/cart/types";
import { formatAznDiscountedPrice, formatAznPrice } from "@/lib/format";
import { getStorePath } from "@/lib/config/domains";
import type { StoreLocation } from "@/lib/locations/types";
import type { CategoryOption } from "@/lib/products/types";
import { getRequiredSelectableProductOptions } from "@/lib/products/variant-utils";
import { cn } from "@/lib/utils";
import {
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Check,
  ChevronDown,
  Dumbbell,
  Home as HomeIcon,
  Laptop,
  PackageSearch,
  Pencil,
  PawPrint,
  Shirt,
  SlidersHorizontal,
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
  searchQuery?: string;
  locale: string;
  storeBaseHref?: string;
  productCardVariant?: string;
  footer?: FooterProps;
  labels: MarketplaceLabels;
  isStoreOwner?: boolean;
  legacyLayout?: boolean;
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

function buildStoreProductHref(storeSlug: string, productSlug: string, storeBaseHref?: string) {
  const baseHref = storeBaseHref ?? getStorePath(storeSlug);

  return `${baseHref === "/" ? "" : baseHref}/products/${productSlug}`;
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
  allLabel,
  onSelect,
}: {
  categories: CategoryOption[];
  selectedCategoryId?: string;
  baseHref: string;
  allLabel: string;
  onSelect?: (category?: CategoryOption) => void;
}) {
  if (categories.length === 0) {
    return null;
  }

  const renderFilterButton = (category?: CategoryOption) => {
    const isSelected = category ? selectedCategoryId === category.id : !selectedCategoryId;
    const label = category?.name ?? allLabel;

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

type MarketplaceDropdownOption = {
  value: string;
  label: string;
};

function MarketplaceDropdown({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  options: MarketplaceDropdownOption[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg border border-input bg-background text-left font-semibold text-foreground transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "h-9 px-2.5 text-xs" : "h-10 px-3 text-sm",
        )}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selectedOption?.label ?? label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className={cn(
            "absolute left-0 top-[calc(100%+0.35rem)] z-30 max-h-72 w-full min-w-[14rem] overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-xl",
            compact && "min-w-[12rem]",
          )}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={`${label}-${option.value || "all"}`}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md text-left transition hover:bg-primary/10",
                  compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
                  selected && "bg-primary/10 font-semibold text-primary",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{option.label}</span>
                {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MarketplaceFilterBar({
  categories,
  selectedCategoryId,
  colors,
  sizes,
  color,
  size,
  minPrice,
  maxPrice,
  inStockOnly,
  onCategory,
  onColor,
  onSize,
  onMinPrice,
  onMaxPrice,
  onStockOnly,
}: {
  categories: CategoryOption[];
  selectedCategoryId?: string;
  colors: string[];
  sizes: string[];
  color: string;
  size: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  onCategory: (category?: CategoryOption) => void;
  onColor: (value: string) => void;
  onSize: (value: string) => void;
  onMinPrice: (value: string) => void;
  onMaxPrice: (value: string) => void;
  onStockOnly: (value: boolean) => void;
}) {
  const t = useTranslations("marketplace");

  return (
    <section className="relative z-20 rounded-lg border bg-card p-2.5 shadow-sm">
      <h2 className="mb-2 text-xs font-bold text-foreground">{t("filters")}</h2>
      <div className="space-y-2">
        <MarketplaceDropdown
          label={t("categoryFilter")}
          value={selectedCategoryId ?? ""}
          options={[
            { value: "", label: t("allCategories") },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
          onChange={(value) => onCategory(categories.find((category) => category.id === value))}
          compact
        />

        <MarketplaceDropdown
          label={t("colorFilter")}
          value={color}
          options={[
            { value: "", label: t("allColors") },
            ...colors.map((value) => ({ value, label: value })),
          ]}
          onChange={onColor}
          compact
        />

        <MarketplaceDropdown
          label={t("sizeFilter")}
          value={size}
          options={[
            { value: "", label: t("allSizes") },
            ...sizes.map((value) => ({ value, label: value })),
          ]}
          onChange={onSize}
          compact
        />

        <div className="flex min-w-0 items-center gap-2">
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={minPrice}
            onChange={(event) => onMinPrice(event.target.value)}
            placeholder={t("minPrice")}
            aria-label={t("minPrice")}
            className="h-9 min-w-0 w-1/2 rounded-lg border border-input bg-background px-2.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-24"
          />
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={maxPrice}
            onChange={(event) => onMaxPrice(event.target.value)}
            placeholder={t("maxPrice")}
            aria-label={t("maxPrice")}
            className="h-9 min-w-0 w-1/2 rounded-lg border border-input bg-background px-2.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-24"
          />
        </div>

        <label className="flex min-h-9 items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => onStockOnly(event.target.checked)}
            className="size-4 accent-[hsl(var(--primary))]"
          />
          {t("inStockOnly")}
        </label>

      </div>
    </section>
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
  onSelect,
}: {
  categories: CategoryOption[];
  onSelect: (category: CategoryOption) => void;
}) {
  const t = useTranslations("marketplace");

  if (categories.length === 0) {
    return (
      <EmptyState
        className="min-h-72 bg-background"
        title={t("noCategories")}
        description={t("noActiveCategories")}
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
  storeSlug,
  storeName,
  storeBaseHref,
  productCardVariant,
  labels,
  layout = "grid",
  isStoreOwner = false,
  forceMobileTwoColumns = false,
}: {
  products: CartProduct[];
  storeSlug?: string;
  storeName?: string;
  storeBaseHref?: string;
  productCardVariant?: string;
  labels: Pick<MarketplaceLabels, "stock">;
  layout?: "grid" | "related";
  isStoreOwner?: boolean;
  forceMobileTwoColumns?: boolean;
}) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const isLiquidGlass = productCardVariant === "liquid-glass";
  const centerRelatedCards = layout === "related" && products.length <= 3;

  if (products.length === 0) {
    return (
      <EmptyState
        className="min-h-80"
        title={t("noStoreProducts")}
        description={t("noProductsForCategory")}
      />
    );
  }

  const now = Date.now();

  return (
    <div
      className={cn(
        layout === "related"
          ? cn(
              "grid min-w-0 grid-cols-2 gap-3 md:flex md:overflow-x-auto md:pb-3 md:pr-3 md:[scrollbar-color:hsl(var(--border))_transparent] md:[scrollbar-width:thin]",
              centerRelatedCards && "md:justify-center",
            )
          : forceMobileTwoColumns
            ? "grid min-w-0 grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            : "grid min-w-0 grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4",
      )}
    >
      {products.map((product) => {
        const isOutOfStock = product.stockQuantity <= 0;
        const requiresDetailSelection =
          getRequiredSelectableProductOptions(product.options ?? []).length > 0;
        const hasDiscount = product.discountAmount > 0;
        const discountPercent =
          hasDiscount && product.priceAmount > 0
            ? Math.round((product.discountAmount / product.priceAmount) * 100)
            : 0;
        const displayStoreName = storeName ?? product.storeName ?? null;
        const detailStoreSlug = storeSlug ?? product.storeSlug ?? "";
        const detailHref = detailStoreSlug
          ? buildStoreProductHref(detailStoreSlug, product.slug, storeBaseHref)
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
            "product-card group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-200 ease-out [contain:layout_paint_style] [content-visibility:auto] [contain-intrinsic-size:340px] hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hover:shadow-md",
            layout === "related" && "md:w-60 md:shrink-0",
            isLiquidGlass &&
              "liquid-glass-product-card border-white/70 bg-white/60 hover:border-cyan-200/80 dark:border-white/10 dark:bg-white/10",
          )}
        >
          <Link
            href={detailHref}
            className="block"
            aria-label={t("productDetailAria", { name: product.name })}
            scroll
          >
            <div
              data-product-card-image
              className={cn(
                "relative aspect-[4/3] overflow-hidden bg-background",
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
                    {t("newLabel")}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
          <FavoriteToggleButton
            productId={product.id}
            productName={product.name}
            compact
            className="absolute right-2 top-2 z-20 size-9 border-border bg-card/95 text-foreground shadow-sm"
          />
          <div data-product-card-body className="relative z-0 flex min-w-0 flex-1 flex-col p-2.5 sm:p-3">
            <div className="mb-1.5 hidden min-w-0 text-xs text-muted-foreground sm:block">
              {displayStoreName ? (
                <span className="block min-w-0 truncate">{displayStoreName}</span>
              ) : (
                <span>{t("store")}</span>
              )}
            </div>
            <h2
              className={cn(
                "line-clamp-2 min-h-9 break-words text-[13px] font-semibold leading-[18px] tracking-normal text-foreground group-hover:text-primary sm:min-h-10 sm:text-sm sm:leading-5",
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
              <p className="truncate text-base font-black text-foreground sm:text-lg">
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
                {isOutOfStock
                  ? t("outOfStock")
                  : t("stockWithCount", { count: product.stockQuantity })}
              </span>
            </p>
            <p className="mt-2 hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              <Truck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              {t("deliveryWithStore")}
            </p>
            <div className="relative z-10 mt-auto grid gap-2 pt-3">
              <div
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {isStoreOwner ? (
                  <Button asChild className="h-10 w-full rounded-lg px-2 text-sm font-semibold shadow-sm">
                    <Link href={`/store/dashboard/products?edit=${product.id}#edit-product-${product.id}`}>
                      <Pencil className="mr-2 size-4" aria-hidden="true" />
                      Redaktə et
                    </Link>
                  </Button>
                ) : requiresDetailSelection ? (
                  <Button
                    asChild
                    className={cn(
                      "h-10 w-full rounded-lg px-2 text-[13px] font-black uppercase shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:text-sm sm:font-medium sm:normal-case",
                      isLiquidGlass &&
                        "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/25",
                    )}
                  >
                    <Link href={detailHref} scroll>
                      {t("viewDetails")}
                    </Link>
                  </Button>
                ) : (
                  <AddToCartButton
                    product={product}
                    disabled={isOutOfStock}
                    className={cn(
                      "h-10 w-full rounded-lg border-0 bg-primary px-2 text-[11px] font-semibold text-primary-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md disabled:bg-muted disabled:text-muted-foreground min-[360px]:text-xs sm:text-sm sm:font-medium",
                      isLiquidGlass &&
                        "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/25 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 sm:border-0 sm:text-white",
                    )}
                  />
                )}
              </div>
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

    if (!mountedRef.current && !searchQuery?.trim() && !categoryId) {
      mountedRef.current = true;
      setProducts(initialProducts);
      setCursor(initialCursor ?? null);
      setHasMore(Boolean(initialHasMore));
      setIsLoadingNext(false);
      return;
    }

    mountedRef.current = true;

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
  }, [initialCursor, initialHasMore, initialProducts, queryKey, categoryId, searchQuery]);

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
  storeSlug,
  storeName,
  storeBaseHref,
  productCardVariant,
  labels,
  isStoreOwner = false,
  forceMobileTwoColumns = false,
}: {
  products: CartProduct[];
  hasMore: boolean;
  isLoadingNext: boolean;
  onLoadNext: () => void;
  storeSlug?: string;
  storeName?: string;
  storeBaseHref?: string;
  productCardVariant?: string;
  labels: Pick<MarketplaceLabels, "stock">;
  isStoreOwner?: boolean;
  forceMobileTwoColumns?: boolean;
}) {
  return (
    <>
      <ProductGrid
        products={products}
        storeSlug={storeSlug}
        storeName={storeName}
        storeBaseHref={storeBaseHref}
        productCardVariant={productCardVariant}
        labels={labels}
        isStoreOwner={isStoreOwner}
        forceMobileTwoColumns={forceMobileTwoColumns}
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
  storeSlug,
  storeName,
  storeBaseHref,
  productCardVariant,
  labels,
  isStoreOwner = false,
  forceMobileTwoColumns = false,
}: {
  initialProducts: CartProduct[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  locale: string;
  categoryId?: string;
  storeId?: string;
  searchQuery?: string;
  sort?: MarketplaceProductSort;
  storeSlug?: string;
  storeName?: string;
  storeBaseHref?: string;
  productCardVariant?: string;
  labels: Pick<MarketplaceLabels, "stock">;
  isStoreOwner?: boolean;
  forceMobileTwoColumns?: boolean;
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
      storeSlug={storeSlug}
      storeName={storeName}
      storeBaseHref={storeBaseHref}
      productCardVariant={productCardVariant}
      labels={labels}
      isStoreOwner={isStoreOwner}
      forceMobileTwoColumns={forceMobileTwoColumns}
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
  const t = useTranslations("marketplace");
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategoryId);
  const [activeSort, setActiveSort] = useState<MarketplaceProductSort>(sort);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const infinite = useInfiniteProducts({
    initialProducts: products,
    initialCursor: nextCursor,
    initialHasMore: hasMore,
    locale,
    categoryId: activeCategoryId,
    searchQuery,
    sort: activeSort,
  });
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId),
    [activeCategoryId, categories],
  );
  const variantFilterValues = useMemo(() => {
    const values = {
      color: new Set<string>(),
      size: new Set<string>(),
    };

    infinite.products.forEach((product) => {
      product.options?.forEach((option) => {
        if (option.type !== "color" && option.type !== "size") {
          return;
        }

        option.values.forEach((value) => {
          if (option.type === "color") {
            values.color.add(value.value);
          } else {
            values.size.add(value.value);
          }
        });
      });
    });

    return {
      colors: [...values.color].sort((a, b) => a.localeCompare(b, "az")),
      sizes: [...values.size].sort((a, b) => a.localeCompare(b, "az", { numeric: true })),
    };
  }, [infinite.products]);
  const visibleProducts = useMemo(() => {
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    return infinite.products.filter((product) => {
      const finalPrice = Math.max(product.priceAmount - product.discountAmount, 0);
      const values = product.options?.flatMap((option) => option.values.map((value) => ({
        type: option.type,
        value: value.value,
      }))) ?? [];

      if (colorFilter && !values.some((value) => value.type === "color" && value.value === colorFilter)) {
        return false;
      }

      if (sizeFilter && !values.some((value) => value.type === "size" && value.value === sizeFilter)) {
        return false;
      }

      if (min !== null && Number.isFinite(min) && finalPrice < min) {
        return false;
      }

      if (max !== null && Number.isFinite(max) && finalPrice > max) {
        return false;
      }

      return !inStockOnly || product.stockQuantity > 0;
    });
  }, [colorFilter, infinite.products, inStockOnly, maxPrice, minPrice, sizeFilter]);
  const hasLocalFilters = Boolean(
    colorFilter || sizeFilter || minPrice || maxPrice || inStockOnly,
  );
  const hasActiveProductFilters = Boolean(
    activeCategoryId || activeSort !== "newest" || hasLocalFilters,
  );

  useEffect(() => {
    setActiveCategoryId(selectedCategoryId);
    setActiveSort(sort);
  }, [selectedCategoryId, sort]);

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

  function selectSort(nextSort: MarketplaceProductSort) {
    setActiveSort(nextSort);

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (nextSort === "newest") {
      url.searchParams.delete("sort");
    } else {
      url.searchParams.set("sort", nextSort);
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }

  function resetFilters() {
    setColorFilter("");
    setSizeFilter("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    selectCategory();
    selectSort("newest");
  }

  const filterBar = (
    <MarketplaceFilterBar
      categories={categories}
      selectedCategoryId={activeCategoryId}
      colors={variantFilterValues.colors}
      sizes={variantFilterValues.sizes}
      color={colorFilter}
      size={sizeFilter}
      minPrice={minPrice}
      maxPrice={maxPrice}
      inStockOnly={inStockOnly}
      onCategory={selectCategory}
      onColor={setColorFilter}
      onSize={setSizeFilter}
      onMinPrice={setMinPrice}
      onMaxPrice={setMaxPrice}
      onStockOnly={setInStockOnly}
    />
  );

  const productGrid = (
    visibleProducts.length === 0 && !infinite.hasMore && !infinite.isLoadingNext ? (
      <EmptyState
        className="min-h-96"
        title={labels.emptyTitle}
        description={labels.emptyDescription}
      />
    ) : (
      <ProductInfiniteGrid
        products={visibleProducts}
        hasMore={!hasLocalFilters && infinite.hasMore}
        isLoadingNext={!hasLocalFilters && infinite.isLoadingNext}
        onLoadNext={infinite.loadNext}
        productCardVariant={productCardVariant}
        labels={{ stock: labels.stock }}
      />
    )
  );

  const sortControl = (
    <MarketplaceDropdown
      label={t("sortFilter")}
      value={activeSort}
      options={[
        { value: "newest", label: t("sortNewest") },
        { value: "oldest", label: t("sortOldest") },
        { value: "price_asc", label: t("sortPriceAsc") },
        { value: "price_desc", label: t("sortPriceDesc") },
      ]}
      onChange={(value) => selectSort(value as MarketplaceProductSort)}
    />
  );

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="container mx-auto max-w-[1480px] py-5 md:py-8">
        <header className="mb-6 hidden min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:flex md:p-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-normal">{t("allProducts")}</h1>
          </div>
        </header>

        <div className="min-w-0">
          <section className="mx-auto min-w-0 w-full max-w-[1180px] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
              <h1 className="text-xl font-black tracking-normal sm:text-2xl">
                {activeCategoryId ? activeCategory?.name ?? t("categoryProducts") : t("allProducts")}
              </h1>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant={isFiltersOpen ? "default" : "outline"}
                  className="h-10 gap-2 px-3 text-sm"
                  aria-expanded={isFiltersOpen}
                  aria-controls="marketplace-filters"
                  onClick={() => setIsFiltersOpen((current) => !current)}
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  {t("filters")}
                  <ChevronDown className={cn("size-4 transition-transform", isFiltersOpen && "rotate-180")} aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 px-3 text-sm text-primary"
                  disabled={!hasActiveProductFilters}
                  onClick={resetFilters}
                >
                  {t("clearFilters")}
                </Button>
                <div className="min-w-[10rem] flex-1 sm:flex-none">{sortControl}</div>
              </div>
            </div>
            {isFiltersOpen ? (
              <div id="marketplace-filters" className="relative z-20 mx-auto w-full max-w-sm">
                {filterBar}
              </div>
            ) : null}
            {productGrid}
          </section>
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
  searchQuery,
  locale,
  storeBaseHref,
  productCardVariant,
  footer,
  labels,
  isStoreOwner = false,
  legacyLayout = false,
}: StorefrontProps) {
  const t = useTranslations("marketplace");
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategoryId);
  const infinite = useInfiniteProducts({
    initialProducts: store.sampleProducts,
    initialCursor: store.productNextCursor,
    initialHasMore: store.productHasMore,
    locale,
    categoryId: activeCategoryId,
    storeId: store.id,
    searchQuery,
  });
  // The data query is already scoped by store ID. Keep a client-side guard too so
  // stale cached state can never render another store's product in "Mağazam".
  const visibleProducts = useMemo(
    () => infinite.products.filter((product) => product.storeId === store.id),
    [infinite.products, store.id],
  );

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
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(7.5rem+env(safe-area-inset-bottom))] dark:bg-background md:pb-0">
      <div className="container max-w-full py-4 md:py-6">
        <nav className="mb-4 flex min-w-0 items-center overflow-hidden text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-primary">
            {t("stores")}
          </Link>
          <span className="mx-2">·</span>
          <span className="min-w-0 truncate font-medium text-foreground">{store.name}</span>
        </nav>

        {isStoreOwner ? (
          <StoreBrandingQuickEdit store={store} />
        ) : (
          <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="relative min-h-44 bg-primary/10 sm:min-h-56 lg:min-h-72">
              {store.coverUrl ? (
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={store.coverUrl}
                    alt={store.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 z-10 flex min-w-0 items-end gap-3 p-4 sm:gap-5 sm:p-7 md:p-9">
                <StoreLogo store={store} className="size-16 shrink-0 border-2 border-background shadow-sm sm:size-24" />
                <div className="min-w-0 pb-0.5 text-white">
                  <h1 className="line-clamp-2 break-words text-2xl font-black leading-tight tracking-normal sm:text-3xl md:text-4xl">
                    {store.name}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-white/85 sm:text-base">
                    {t("productCount", { count: store.productCount })}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isStoreOwner ? <PublicStoreLocationSection locations={locations} /> : null}

        <section id="products" className="mt-4 min-w-0 rounded-lg bg-card p-4 shadow-sm md:mt-6 md:p-8">
          <div className="mb-6 min-w-0">
            <h2 className="break-words text-xl font-black tracking-normal">
              {t("storeProducts")}
            </h2>
          </div>
          <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <CategoryFilters
                categories={categories}
                selectedCategoryId={activeCategoryId}
                baseHref={storeBaseHref ?? getStorePath(store.slug)}
                allLabel={t("allCategories")}
                onSelect={selectCategory}
              />
            </aside>
            <div className="min-w-0">
              <ProductInfiniteGrid
                products={visibleProducts}
                hasMore={infinite.hasMore}
                isLoadingNext={infinite.isLoadingNext}
                onLoadNext={infinite.loadNext}
                storeSlug={store.slug}
                storeName={store.name}
                storeBaseHref={storeBaseHref}
                productCardVariant={productCardVariant}
                labels={{ stock: labels.stock }}
                isStoreOwner={isStoreOwner}
                forceMobileTwoColumns
              />
            </div>
          </div>
        </section>
      </div>
      <SiteFooter {...footer} />
    </main>
  );
}
