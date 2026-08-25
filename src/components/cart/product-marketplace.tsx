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
  Bus,
  Car,
  Check,
  Clock,
  ChevronDown,
  Dumbbell,
  ExternalLink,
  Home as HomeIcon,
  Laptop,
  MapPin,
  Navigation,
  PackageSearch,
  PackageCheck,
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
  storeBaseHref?: string;
  productCardVariant?: string;
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

function getStoreLocationMapUrl(location: StoreLocation | null, fallbackAddress?: string | null) {
  if (location?.mapLink) {
    return location.mapLink;
  }

  if (location?.latitude !== null && location?.longitude !== null && location?.latitude !== undefined && location?.longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }

  const query = location
    ? [location.city, location.district, location.address].filter(Boolean).join(", ")
    : fallbackAddress;

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
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
}: {
  label: string;
  value: string;
  options: MarketplaceDropdownOption[];
  onChange: (value: string) => void;
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
        className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 text-left text-sm font-semibold text-foreground transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="absolute left-0 top-[calc(100%+0.35rem)] z-30 max-h-72 w-full min-w-[14rem] overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-xl"
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
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition hover:bg-primary/10",
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
  onReset,
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
  onReset: () => void;
}) {
  const t = useTranslations("marketplace");
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const hasActiveFilters = Boolean(
    selectedCategoryId || color || size || minPrice || maxPrice || inStockOnly,
  );

  return (
    <section className="relative z-20 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <h2 className="mb-3 text-sm font-bold text-foreground">{t("filters")}</h2>
      <div className="space-y-3">
        <MarketplaceDropdown
          label={t("categoryFilter")}
          value={selectedCategoryId ?? ""}
          options={[
            { value: "", label: t("allCategories") },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
          onChange={(value) => onCategory(categories.find((category) => category.id === value))}
        />

        <MarketplaceDropdown
          label={t("colorFilter")}
          value={color}
          options={[
            { value: "", label: t("allColors") },
            ...colors.map((value) => ({ value, label: value })),
          ]}
          onChange={onColor}
        />

        <MarketplaceDropdown
          label={t("sizeFilter")}
          value={size}
          options={[
            { value: "", label: t("allSizes") },
            ...sizes.map((value) => ({ value, label: value })),
          ]}
          onChange={onSize}
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
            className="h-10 min-w-0 w-1/2 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-24"
          />
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={maxPrice}
            onChange={(event) => onMaxPrice(event.target.value)}
            placeholder={t("maxPrice")}
            aria-label={t("maxPrice")}
            className="h-10 min-w-0 w-1/2 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-24"
          />
        </div>

        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => onStockOnly(event.target.checked)}
            className="size-4 accent-[hsl(var(--primary))]"
          />
          {t("inStockOnly")}
        </label>

        {hasActiveFilters ? (
          <Button type="button" variant="ghost" className="h-10 w-full px-3 text-sm text-primary" onClick={onReset}>
            {t("clearFilters")}
          </Button>
        ) : null}
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
}: {
  products: CartProduct[];
  storeSlug?: string;
  storeName?: string;
  storeBaseHref?: string;
  productCardVariant?: string;
  labels: Pick<MarketplaceLabels, "stock">;
  layout?: "grid" | "related";
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
                {requiresDetailSelection ? (
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
  storeSlug,
  storeName,
  storeBaseHref,
  productCardVariant,
  labels,
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
      onReset={resetFilters}
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

        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-7">
          <aside className="min-w-0 lg:sticky lg:top-24">{filterBar}</aside>
          <section className="mx-auto min-w-0 w-full max-w-[1180px] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
              <h1 className="text-xl font-black tracking-normal sm:text-2xl">
                {activeCategoryId ? activeCategory?.name ?? t("categoryProducts") : t("allProducts")}
              </h1>
              {sortControl}
            </div>
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
  locale,
  storeBaseHref,
  productCardVariant,
  footer,
  labels,
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
  const primaryPhone = primaryLocation?.phone || store.phone;
  const primaryMapUrl = getStoreLocationMapUrl(primaryLocation, primaryAddress);
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
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(7.5rem+env(safe-area-inset-bottom))] dark:bg-background md:pb-0">
      <div className="container max-w-full py-4 md:py-6">
        <nav className="mb-4 flex min-w-0 items-center overflow-hidden text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-primary">
            {t("stores")}
          </Link>
          <span className="mx-2">·</span>
          <span className="min-w-0 truncate font-medium text-foreground">{store.name}</span>
        </nav>

        <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="relative h-20 bg-primary/10 sm:h-44 lg:h-56">
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
            <div className="absolute bottom-0 left-3 z-20 translate-y-1/2 md:left-8">
              <StoreLogo store={store} className="size-14 shadow-sm sm:size-24" />
            </div>
          </div>
          <div className="grid min-w-0 gap-3 p-3 pt-9 md:grid-cols-[minmax(0,1fr)_260px] md:gap-5 md:p-7 md:pt-14">
            <div className="flex min-w-0 gap-3 md:gap-4">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1 className="line-clamp-2 break-words text-2xl font-black leading-tight tracking-normal md:text-3xl">
                    {store.name}
                  </h1>
                  <p className="text-sm font-semibold text-muted-foreground md:text-base">
                      {t("productCount", { count: store.productCount })}
                  </p>
                </div>
                {store.description ? (
                  <p className="mt-2 hidden max-w-2xl break-words text-sm leading-6 text-muted-foreground md:mt-3 md:line-clamp-2 md:block md:text-foreground">
                    {store.description}
                  </p>
                ) : null}
                <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 text-xs text-muted-foreground md:mt-4 md:gap-2 md:text-sm">
                  {primaryAddress ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1.5 md:gap-2 md:px-3">
                      <MapPin className="size-3.5 shrink-0 text-primary md:size-4" aria-hidden="true" />
                      <span className="min-w-0 truncate">{primaryAddress}</span>
                    </span>
                  ) : null}
                  {primaryLocation?.showMetro && primaryLocation.nearestMetro ? (
                    <span className="hidden min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 sm:inline-flex">
                      <Navigation className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">
                        {primaryLocation.nearestMetro}
                        {primaryLocation.metroWalkMinutes
                          ? ` · ${primaryLocation.metroWalkMinutes} dəq. piyada`
                          : ""}
                        {primaryLocation.metroDistanceMeters
                          ? ` · ${primaryLocation.metroDistanceMeters} m`
                          : ""}
                      </span>
                    </span>
                  ) : null}
                  {primaryLocation?.showBus &&
                  (primaryLocation.busStopName || primaryLocation.busRoutes.length) ? (
                    <span className="hidden min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 sm:inline-flex">
                      <Bus className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">
                        {primaryLocation.busStopName ?? "Avtobus"}
                        {primaryLocation.busRoutes.length
                          ? ` · ${primaryLocation.busRoutes.join(", ")}`
                          : ""}
                      </span>
                    </span>
                  ) : null}
                  {primaryLocation?.workingHours ? (
                    <span className="hidden min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 sm:inline-flex">
                      <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">
                        {primaryLocation.workingHours}
                      </span>
                    </span>
                  ) : null}
                  {primaryPhone ? (
                    <a
                      href={`tel:${primaryPhone.replace(/\s/g, "")}`}
                      className="hidden min-w-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 transition hover:border-primary/40 hover:text-primary sm:inline-flex"
                    >
                      <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 break-words">{primaryPhone}</span>
                    </a>
                  ) : null}
                  {primaryLocation?.pickupAvailable ? (
                    <span className="hidden min-w-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:inline-flex">
                      <PackageCheck className="size-3.5 shrink-0" aria-hidden="true" />
                      Özün götürmə
                    </span>
                  ) : null}
                  {primaryLocation?.deliveryAvailable ? (
                    <span className="hidden min-w-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200 sm:inline-flex">
                      <Truck className="size-3.5 shrink-0" aria-hidden="true" />
                      Çatdırılma
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 md:grid-cols-1 md:content-start md:gap-3">
              {primaryPhone ? (
                <Button asChild className="h-10 w-full min-w-0 rounded-xl text-xs md:h-10 md:text-sm">
                  <a href={`tel:${primaryPhone.replace(/\s/g, "")}`}>
                    <Phone className="mr-1.5 size-4 shrink-0 md:mr-2" aria-hidden="true" />
                    <span className="truncate">{t("showPhone")}</span>
                  </a>
                </Button>
              ) : null}
              {primaryMapUrl ? (
                <Button asChild variant="outline" className="h-10 w-full min-w-0 rounded-xl border-primary/20 bg-background text-xs hover:bg-primary/5 md:h-10 md:text-sm">
                  <a href={primaryMapUrl} target="_blank" rel="noreferrer">
                    <MapPin className="mr-1.5 size-4 shrink-0 md:mr-2" aria-hidden="true" />
                    <span className="truncate">Xəritədə göstər</span>
                    <ExternalLink className="ml-1.5 size-4 shrink-0 md:ml-2" aria-hidden="true" />
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
              {t("storeOffers", { storeName: store.name, count: store.productCount })}
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
              />
            </div>
          </div>
        </section>
      </div>
      <SiteFooter {...footer} />
    </main>
  );
}
