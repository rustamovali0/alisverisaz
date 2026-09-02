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
import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { EmptyState } from "@/components/common/empty-state";
import { GlobalLoader } from "@/components/common/global-loader";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { PublicStoreLocationSection } from "@/components/locations/public-store-location-section";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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
  ArrowRight,
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Check,
  ChevronDown,
  Dumbbell,
  Heart,
  Home as HomeIcon,
  Laptop,
  PackageSearch,
  Pencil,
  PawPrint,
  Shirt,
  ShoppingCart,
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

const DEFAULT_MARKETPLACE_BANNER_URL = "/auth/auth-banner.png";
const PRODUCT_PAGE_SIZE = 52;

type FooterProps = {
  siteName?: string;
  logoUrl?: string;
  darkLogoUrl?: string;
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

function StoreHeroCover({ store }: { store: MarketplaceStore }) {
  const [hasError, setHasError] = useState(false);
  const coverUrl = store.coverUrl || DEFAULT_MARKETPLACE_BANNER_URL;

  if (hasError) {
    return (
      <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#eff6ff,#f8fafc)] dark:bg-[linear-gradient(135deg,#111827,#020617)]">
        <Store className="size-12 text-blue-300 dark:text-blue-500/60" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt={store.name}
      className="h-full w-full object-cover"
      onError={() => setHasError(true)}
    />
  );
}

function CustomStorefrontHeader({
  store,
  storeHomeHref,
  searchQuery,
}: {
  store: MarketplaceStore;
  storeHomeHref: string;
  searchQuery?: string;
}) {
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const navItems = [
    { href: storeHomeHref, label: "Ana səhifə" },
    { href: `${storeHomeHref === "/" ? "" : storeHomeHref}#products`, label: "Məhsullar" },
    { href: `${storeHomeHref === "/" ? "" : storeHomeHref}#store-categories`, label: "Kateqoriyalar" },
    { href: `${storeHomeHref === "/" ? "" : storeHomeHref}#contact`, label: "Əlaqə" },
  ];
  const iconButtonClass =
    "grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-900 transition md:hover:border-blue-200 md:hover:bg-blue-50 md:hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:md:hover:border-blue-800 dark:md:hover:bg-blue-950/30";

  useEffect(() => {
    function updateHeaderSearchVisibility() {
      setShowHeaderSearch(window.scrollY > 160);
    }

    updateHeaderSearchVisibility();
    window.addEventListener("scroll", updateHeaderSearchVisibility, { passive: true });

    return () => window.removeEventListener("scroll", updateHeaderSearchVisibility);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex min-h-16 w-full max-w-[1280px] min-w-0 items-center gap-2 px-4 sm:min-h-[68px] sm:gap-3 sm:px-6 lg:px-8">
        <Link href={storeHomeHref} prefetch className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
          <StoreLogo store={store} className="size-10 shrink-0 rounded-xl border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900 sm:size-11" />
          <span className="min-w-0 truncate text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
            {store.name}
          </span>
        </Link>
        <nav className="ml-4 hidden min-w-0 items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition md:hover:bg-slate-50 md:hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-slate-300 dark:md:hover:bg-slate-900 dark:md:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div
          className={cn(
            "ml-auto hidden flex-1 transition-[max-width,opacity] duration-200 xl:block",
            showHeaderSearch
              ? "min-w-[280px] max-w-[360px] opacity-100"
              : "pointer-events-none max-w-0 flex-none overflow-hidden opacity-0",
          )}
        >
          <MarketplaceSearch
            stores={[store]}
            defaultValue={searchQuery}
            storeSlug={store.slug}
            searchBaseHref={storeHomeHref}
            resultsAnchorId="products"
            className="rounded-xl border border-slate-200 bg-white p-1 shadow-none dark:border-slate-800 dark:bg-slate-950"
            inputClassName="h-10 rounded-lg border-0 bg-slate-50 pl-10 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-200 dark:bg-slate-900 dark:text-slate-100"
            buttonClassName="h-10 rounded-lg bg-blue-600 px-4 text-white md:hover:bg-blue-700"
          />
        </div>
        <div className="hidden shrink-0 lg:block">
          <HeaderAccountActions showSellerCta={false} customerOnlyRegister />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 xl:ml-0">
          <ThemeToggle className={iconButtonClass} iconClassName="size-6 stroke-[2]" />
          <Button asChild variant="ghost" size="icon" className={iconButtonClass} aria-label="Favorilər">
            <Link href="/favorites" prefetch>
              <Heart className="size-6 stroke-[2]" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className={iconButtonClass} aria-label="Səbət">
            <Link href="/cart" prefetch>
              <ShoppingCart className="size-6 stroke-[2]" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function CustomStoreFooter({
  store,
  storeHomeHref,
}: {
  store: MarketplaceStore;
  storeHomeHref: string;
}) {
  const baseHref = storeHomeHref === "/" ? "" : storeHomeHref;

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <StoreLogo store={store} className="size-11 shrink-0 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            <h2 className="truncate text-2xl font-semibold text-slate-950 dark:text-slate-100">
              {store.name}
            </h2>
          </div>
          {store.description ? (
            <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
              {store.description}
            </p>
          ) : null}
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm font-medium text-slate-600 dark:text-slate-300 sm:flex sm:items-center">
          <Link href={storeHomeHref} prefetch className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
            Ana səhifə
          </Link>
          <Link href={`${baseHref}#products`} className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
            Məhsullar
          </Link>
          <Link href={`${baseHref}#store-categories`} className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
            Kateqoriyalar
          </Link>
          <Link href={`${baseHref}#contact`} className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
            Əlaqə
          </Link>
        </nav>
      </div>
    </footer>
  );
}

function getStoreHeroTitle(store: MarketplaceStore) {
  if (store.heroTitle?.trim()) {
    return store.heroTitle.trim();
  }

  return `${store.name.trim()} mağazası`;
}

function getStoreHeroSubtitle(store: MarketplaceStore, primaryCategoryName?: string) {
  if (store.heroSubtitle?.trim()) {
    return store.heroSubtitle.trim();
  }

  const productCount = `${store.productCount} məhsul`;

  return primaryCategoryName
    ? `${productCount} • ${primaryCategoryName} və daha çox`
    : productCount;
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
  layout = "stacked",
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
  layout?: "stacked" | "wide";
}) {
  const t = useTranslations("marketplace");
  const isWide = layout === "wide";

  return (
    <section className={cn("relative z-20 rounded-lg border bg-card shadow-sm", isWide ? "p-3 md:p-4" : "p-2.5")}>
      <h2 className={cn("text-xs font-bold text-foreground", isWide ? "mb-3" : "mb-2")}>{t("filters")}</h2>
      <div className={cn(isWide ? "grid gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))_minmax(11rem,0.8fr)] md:items-center" : "space-y-2")}>
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
            className={cn("h-9 min-w-0 w-1/2 rounded-lg border border-input bg-background px-2.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30", !isWide && "sm:w-24")}
          />
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={maxPrice}
            onChange={(event) => onMaxPrice(event.target.value)}
            placeholder={t("maxPrice")}
            aria-label={t("maxPrice")}
            className={cn("h-9 min-w-0 w-1/2 rounded-lg border border-input bg-background px-2.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30", !isWide && "sm:w-24")}
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
  "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-900/40",
  "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
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
      <div className="grid grid-cols-2 gap-3">
        {categories.map((category, index) => {
          const Icon = getCategoryIcon(category);
          const iconStyle = CATEGORY_ICON_STYLES[index % CATEGORY_ICON_STYLES.length];

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category)}
              className="group flex min-h-[112px] min-w-0 touch-manipulation flex-col items-center justify-between rounded-[14px] border border-slate-200 bg-white p-3.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-200 ease-out active:scale-[0.98] dark:border-slate-800 dark:bg-card"
            >
              <span className={cn("grid size-12 place-items-center rounded-xl ring-1", iconStyle)}>
                <Icon className="size-6 stroke-[2.2]" aria-hidden="true" />
              </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="line-clamp-2 min-w-0 text-[14px] font-semibold leading-5 text-slate-700 dark:text-muted-foreground">
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
  compactMobileCards = false,
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
  compactMobileCards?: boolean;
}) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const isLiquidGlass = productCardVariant === "liquid-glass";
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
          ? "grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
          : forceMobileTwoColumns
            ? "grid min-w-0 grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
            : "grid min-w-0 grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4",
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
            "product-card group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,border-color,box-shadow] duration-200 ease-out [contain:layout_paint_style] [content-visibility:auto] [contain-intrinsic-size:340px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-card dark:text-slate-100 md:hover:-translate-y-0.5 md:hover:border-slate-300 md:hover:shadow-[0_8px_30px_rgba(15,23,42,0.07)]",
            compactMobileCards && "max-sm:rounded-xl",
            isLiquidGlass &&
              "liquid-glass-product-card border-white/70 bg-white/60 dark:border-white/10 dark:bg-white/10 md:hover:border-cyan-200/80",
          )}
        >
          <Link
            href={detailHref}
            className="block"
            aria-label={t("productDetailAria", { name: product.name })}
            prefetch={false}
            scroll
          >
            <div
              data-product-card-image
              className={cn(
                "relative aspect-[4/3] overflow-hidden bg-slate-50 dark:bg-slate-900",
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
                <div className="flex h-full items-center justify-center bg-muted/60 text-primary">
                  <span className="grid size-14 place-items-center rounded-full border border-primary/15 bg-background/85 shadow-sm">
                    <ShoppingCart className="size-7 stroke-[2.4]" aria-hidden="true" />
                  </span>
                </div>
              )}
              <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                {hasDiscount ? (
                  <span className="rounded-full bg-rose-500 px-2 py-1 text-[11px] font-black text-white">
                    -{discountPercent}%
                  </span>
                ) : null}
                {isNewProduct ? (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
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
                "line-clamp-2 min-h-9 break-words text-[13px] font-semibold leading-[18px] tracking-normal text-slate-950 dark:text-slate-100 sm:min-h-10 sm:text-sm sm:leading-5 md:group-hover:text-blue-700 md:dark:group-hover:text-blue-300",
                isLiquidGlass && "font-black md:group-hover:text-cyan-700 md:dark:group-hover:text-cyan-200",
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
              <p className="truncate text-base font-bold text-slate-950 dark:text-slate-100 sm:text-lg">
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
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
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
            <div className={cn("relative z-10 mt-auto grid gap-2", compactMobileCards ? "pt-2.5 sm:pt-3" : "pt-3")}>
              <div
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {isStoreOwner ? (
                  <Button asChild className="h-10 w-full rounded-lg px-2 text-sm font-semibold shadow-sm">
                    <Link href={`/store/dashboard/products/${product.id}/edit`}>
                      <Pencil className="mr-2 size-4" aria-hidden="true" />
                      Redaktə et
                    </Link>
                  </Button>
                ) : requiresDetailSelection ? (
                  <Button
                    asChild
                    className={cn(
                      "!h-11 min-h-11 w-full justify-center gap-2 rounded-xl border-0 bg-blue-600 px-2 text-[12px] font-semibold leading-none text-white shadow-none transition duration-200 md:hover:-translate-y-0.5 md:hover:bg-blue-700 md:hover:text-white md:hover:shadow-[0_8px_22px_rgba(37,99,235,0.18)] disabled:bg-slate-100 disabled:text-slate-400 min-[360px]:text-[13px] sm:!h-12 sm:px-4 sm:text-sm sm:font-medium",
                      compactMobileCards && "max-sm:!h-10 max-sm:min-h-10 max-sm:rounded-[10px] max-sm:text-xs",
                      isLiquidGlass &&
                        "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-500/20 md:hover:shadow-lg md:hover:shadow-cyan-500/25",
                    )}
                  >
                    <Link href={detailHref} prefetch={false} scroll className="inline-flex items-center justify-center">
                      <PackageSearch className="mr-2 size-5 shrink-0 stroke-[2.2]" aria-hidden="true" />
                      {t("viewDetails")}
                    </Link>
                  </Button>
                ) : (
                  <AddToCartButton
                    product={product}
                    disabled={isOutOfStock}
                    className={cn(
                      "!h-11 min-h-11 w-full rounded-xl border-0 bg-blue-600 px-2 text-[12px] font-semibold text-white shadow-none transition duration-200 md:hover:-translate-y-0.5 md:hover:bg-blue-700 md:hover:text-white md:hover:shadow-[0_8px_22px_rgba(37,99,235,0.18)] disabled:bg-slate-100 disabled:text-slate-400 min-[360px]:text-[13px] sm:!h-12 sm:px-4 sm:text-sm sm:font-medium",
                      compactMobileCards && "max-sm:!h-10 max-sm:min-h-10 max-sm:rounded-[10px] max-sm:text-xs",
                      isLiquidGlass &&
                        "bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-500/20 md:hover:shadow-lg md:hover:shadow-cyan-500/25 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 sm:border-0 sm:text-white",
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
      limit: String(PRODUCT_PAGE_SIZE),
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
      limit: String(PRODUCT_PAGE_SIZE),
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
  compactMobileCards = false,
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
  compactMobileCards?: boolean;
}) {
  const t = useTranslations("marketplace");

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
        compactMobileCards={compactMobileCards}
      />
      {hasMore ? (
        <div className="mb-10 mt-7 flex justify-center md:mb-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full px-6 font-bold"
            disabled={isLoadingNext}
            onClick={onLoadNext}
          >
            {isLoadingNext ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      ) : null}
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
  compactMobileCards = false,
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
  compactMobileCards?: boolean;
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
      compactMobileCards={compactMobileCards}
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
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 pb-[calc(6rem+env(safe-area-inset-bottom))] dark:bg-background md:pb-0">
      <div className="container mx-auto max-w-[1280px] py-5 md:py-10">
        <header className="mb-6 hidden min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card sm:flex-row sm:items-center sm:justify-between md:flex md:p-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-slate-100">{t("allProducts")}</h1>
          </div>
        </header>

        <div className="min-w-0">
          <section className="mx-auto min-w-0 w-full max-w-[1180px] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card">
              <h1 className="text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
                {activeCategoryId ? activeCategory?.name ?? t("categoryProducts") : t("allProducts")}
              </h1>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant={isFiltersOpen ? "default" : "outline"}
                  className={cn(
                    "h-10 gap-2 rounded-[10px] px-3 text-sm shadow-none",
                    isFiltersOpen
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                  )}
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
                  className="h-10 rounded-[10px] px-3 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-950"
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
  const home = useTranslations("home");
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategoryId);
  const [activeSort, setActiveSort] = useState<MarketplaceProductSort>("newest");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showAllMobileCategories, setShowAllMobileCategories] = useState(false);
  const infinite = useInfiniteProducts({
    initialProducts: store.sampleProducts,
    initialCursor: store.productNextCursor,
    initialHasMore: store.productHasMore,
    locale,
    categoryId: activeCategoryId,
    storeId: store.id,
    searchQuery,
    sort: activeSort,
  });
  // The data query is already scoped by store ID. Keep a client-side guard too so
  // stale cached state can never render another store's product in "Mağazam".
  const visibleProducts = useMemo(
    () => infinite.products.filter((product) => product.storeId === store.id),
    [infinite.products, store.id],
  );
  const storeHomeHref = storeBaseHref ?? getStorePath(store.slug);
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
  const filteredVisibleProducts = useMemo(() => {
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    return visibleProducts.filter((product) => {
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
  }, [colorFilter, inStockOnly, maxPrice, minPrice, sizeFilter, visibleProducts]);
  const hasLocalFilters = Boolean(
    colorFilter || sizeFilter || minPrice || maxPrice || inStockOnly,
  );
  const hasActiveProductFilters = Boolean(
    activeCategoryId || activeSort !== "newest" || hasLocalFilters,
  );

  useEffect(() => {
    setActiveCategoryId(selectedCategoryId);
  }, [selectedCategoryId]);
  const isMarketplaceStoreHref = storeHomeHref.startsWith("/store/");
  const storeProductCategoryIds = useMemo(
    () => new Set(store.categoryIds),
    [store.categoryIds],
  );
  const isCustomStorefront = !legacyLayout && !isMarketplaceStoreHref;
  const legacyCategories = useMemo(
    () => categories.filter((category) => storeProductCategoryIds.has(category.id)),
    [categories, storeProductCategoryIds],
  );
  const sortedStoreCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const aHasProducts = storeProductCategoryIds.has(a.id);
        const bHasProducts = storeProductCategoryIds.has(b.id);

        if (aHasProducts !== bHasProducts) {
          return aHasProducts ? -1 : 1;
        }

        return a.name.localeCompare(b.name, "az");
      }),
    [categories, storeProductCategoryIds],
  );
  const primaryStoreCategory = sortedStoreCategories.find((category) =>
    storeProductCategoryIds.has(category.id),
  );
  const heroCategories = sortedStoreCategories.slice(0, 5);
  const heroTitle = getStoreHeroTitle(store);
  const heroSubtitle = getStoreHeroSubtitle(store, primaryStoreCategory?.name);
  const customHeroCategories = heroCategories.slice(0, 4);

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

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
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
      layout="wide"
    />
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

  const productsSection = (
    <section id="products" className="mt-4 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card md:mt-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="break-words text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
          {t("storeProducts")}
        </h2>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant={isFiltersOpen ? "default" : "outline"}
            className="h-10 gap-2 rounded-[10px] px-3 text-sm"
            aria-expanded={isFiltersOpen}
            aria-controls="storefront-filters"
            onClick={() => setIsFiltersOpen((current) => !current)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t("filters")}
            <ChevronDown className={cn("size-4 transition-transform", isFiltersOpen && "rotate-180")} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-[10px] px-3 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            disabled={!hasActiveProductFilters}
            onClick={resetFilters}
          >
            {t("clearFilters")}
          </Button>
          <div className="min-w-[10rem] flex-1 sm:flex-none">{sortControl}</div>
        </div>
      </div>
      {isFiltersOpen ? (
        <div id="storefront-filters" className="relative z-20 mb-5 w-full">
          {filterBar}
        </div>
      ) : null}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <CategoryFilters
            categories={legacyCategories}
            selectedCategoryId={activeCategoryId}
            baseHref={storeHomeHref}
            allLabel={t("allCategories")}
            onSelect={selectCategory}
          />
        </aside>
        <div className="min-w-0">
          <ProductInfiniteGrid
            products={filteredVisibleProducts}
            hasMore={!hasLocalFilters && infinite.hasMore}
            isLoadingNext={!hasLocalFilters && infinite.isLoadingNext}
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
  );

  const modernCategoriesSection =
    sortedStoreCategories.length > 0 ? (
      <section
        id="store-categories"
        data-home-categories
        className={cn(
          "min-w-0 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card",
          isCustomStorefront ? "p-3.5 sm:p-5 lg:p-6" : "p-4 sm:p-5 lg:p-6",
        )}
      >
        <div className={cn("flex min-w-0 items-center justify-between gap-3", isCustomStorefront ? "mb-3.5 sm:mb-5" : "mb-5")}>
          <div className="min-w-0">
            <h2 className="truncate text-[22px] font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
              {legacyLayout ? home("categories") : "Seçilmiş kateqoriyalar"}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-blue-600 transition md:hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-blue-300 dark:md:hover:text-blue-200 sm:text-sm"
            onClick={() => {
              if (isCustomStorefront && !showAllMobileCategories) {
                setShowAllMobileCategories(true);
                return;
              }

              selectCategory();
            }}
          >
            Hamısına bax
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {sortedStoreCategories.map((category, index) => {
            const isSelected = activeCategoryId === category.id;
            const hasProducts = storeProductCategoryIds.has(category.id);
            const Icon = getCategoryIcon(category);
            const iconStyle = CATEGORY_ICON_STYLES[index % CATEGORY_ICON_STYLES.length];

            return (
              <button
                key={category.id}
                type="button"
                className={cn(
                  "group min-w-0 rounded-[14px] border border-slate-200 bg-white text-left shadow-none transition duration-200 md:hover:-translate-y-0.5 md:hover:border-slate-300 md:hover:shadow-[0_8px_30px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-800 dark:bg-background dark:text-slate-100",
                  isCustomStorefront
                    ? "flex min-h-[84px] items-center gap-2.5 p-3 sm:min-h-[104px] sm:flex-col sm:items-start sm:justify-between sm:gap-3 sm:p-4"
                    : "flex min-h-[104px] flex-col items-start justify-between gap-3 p-4",
                  isCustomStorefront && !showAllMobileCategories && index >= 6 && "max-sm:hidden",
                  !hasProducts && "text-muted-foreground opacity-70",
                  isSelected && "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-200",
                )}
                onClick={() => selectCategory(category)}
              >
                <span className={cn("grid shrink-0 place-items-center rounded-xl ring-1", isCustomStorefront ? "size-9 sm:size-11" : "size-11", iconStyle)}>
                  <Icon className={cn("stroke-[2.1]", isCustomStorefront ? "size-[18px] sm:size-5" : "size-5")} aria-hidden="true" />
                </span>
                <span className={cn("flex min-w-0 gap-2", isCustomStorefront ? "flex-1 items-center justify-between sm:w-full sm:items-end" : "w-full items-end justify-between")}>
                  <span className="line-clamp-2 min-w-0 break-words text-[14px] font-semibold leading-5 text-slate-950 dark:text-slate-100 sm:text-sm">
                    {category.name}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-slate-400 transition md:group-hover:translate-x-0.5 md:group-hover:text-blue-600 dark:md:group-hover:text-blue-300" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    ) : null;

  const modernProductsSection = (
      <section
        id="products"
        className={cn(
          "min-w-0 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card",
          isCustomStorefront ? "p-3.5 sm:p-5 lg:p-6" : "p-4 sm:p-5 lg:p-6",
        )}
      >
      <div className={cn("grid min-w-0 gap-3 lg:flex lg:items-end lg:justify-between", isCustomStorefront ? "mb-4 sm:mb-5" : "mb-5")}>
        <div className="min-w-0">
          <h2 className="truncate text-[22px] font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">{home("recentlyListed")}</h2>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center sm:justify-end">
          <Button
            type="button"
            variant={isFiltersOpen ? "default" : "outline"}
            className={cn(
              "gap-2 rounded-[10px] px-3 text-sm shadow-none",
              isCustomStorefront ? "h-10 sm:h-11" : "h-11",
              isFiltersOpen
                ? "bg-blue-600 text-white md:hover:bg-blue-700"
                : "border-slate-200 bg-white text-slate-700 md:hover:bg-slate-50 md:hover:text-slate-950",
            )}
            aria-expanded={isFiltersOpen}
            aria-controls="storefront-modern-filters"
            onClick={() => setIsFiltersOpen((current) => !current)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t("filters")}
            <ChevronDown className={cn("size-4 transition-transform", isFiltersOpen && "rotate-180")} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "rounded-[10px] px-3 text-sm text-slate-500 md:hover:bg-slate-100 md:hover:text-slate-950 disabled:opacity-45 dark:md:hover:bg-slate-900 dark:md:hover:text-slate-100",
              isCustomStorefront ? "h-10 sm:h-11" : "h-11",
            )}
            disabled={!hasActiveProductFilters}
            onClick={resetFilters}
          >
            {t("clearFilters")}
          </Button>
          <div className="col-span-2 min-w-0 sm:col-auto sm:min-w-[10rem]">{sortControl}</div>
        </div>
      </div>
      {isFiltersOpen ? (
        <div id="storefront-modern-filters" className="relative z-20 mb-5 w-full">
          {filterBar}
        </div>
      ) : null}
      <ProductInfiniteGrid
        products={filteredVisibleProducts}
        hasMore={!hasLocalFilters && infinite.hasMore}
        isLoadingNext={!hasLocalFilters && infinite.isLoadingNext}
        onLoadNext={infinite.loadNext}
        storeSlug={store.slug}
        storeName={store.name}
        storeBaseHref={storeBaseHref}
        productCardVariant={productCardVariant}
        labels={{ stock: labels.stock }}
        isStoreOwner={isStoreOwner}
        forceMobileTwoColumns
        compactMobileCards={isCustomStorefront}
      />
    </section>
  );

  if (!isCustomStorefront) {
    return (
      <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 px-4 py-4 pb-[calc(88px+env(safe-area-inset-bottom))] dark:bg-slate-950 sm:px-6 sm:py-8 md:pb-10 lg:px-8 lg:py-10">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-8 md:gap-10">
          {isStoreOwner ? (
            <StoreBrandingQuickEdit store={store} />
          ) : (
            <section className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card sm:p-4">
              <div className="relative overflow-hidden rounded-2xl bg-slate-950">
                <div className="relative h-[210px] sm:h-[280px] lg:h-[340px]">
                  <StoreHeroCover store={store} />
                  <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.78),rgba(15,23,42,0.42),rgba(2,6,23,0.64))]" aria-hidden="true" />
                </div>
                <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6 lg:p-8">
                  <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-end">
                    <div className="flex min-w-0 items-end gap-3 sm:gap-5">
                      <StoreLogo store={store} className="size-20 shrink-0 rounded-2xl border-2 border-white bg-white shadow-[0_14px_32px_rgba(2,6,23,0.22)] sm:size-24 lg:size-28" />
                      <div className="min-w-0 pb-1 text-white">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                          Alışveriş mağazası
                        </p>
                        <h1 className="line-clamp-2 break-words text-[30px] font-semibold leading-tight tracking-normal sm:text-4xl lg:text-[44px]">
                          {store.name}
                        </h1>
                        <p className="mt-2 break-words text-sm font-medium text-white/80 sm:text-base">
                          {heroSubtitle}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <MarketplaceSearch
                        stores={[store]}
                        defaultValue={searchQuery}
                        storeSlug={store.slug}
                        searchBaseHref={storeHomeHref}
                        className="rounded-[14px] bg-white p-1.5 shadow-[0_12px_35px_rgba(2,6,23,0.22)]"
                        inputClassName="h-12 rounded-[12px] border-transparent bg-transparent pl-11 text-[16px] text-slate-900 placeholder:text-slate-500 focus-visible:ring-0"
                        buttonClassName="!size-11 !min-w-11 rounded-[10px] bg-blue-600 p-0 text-white md:hover:bg-blue-700"
                        buttonSize="lg"
                        stackOnMobile
                        compactActions
                      />
                    </div>
                  </div>
                  {heroCategories.length > 0 ? (
                    <div className="mt-5 flex max-w-full flex-wrap gap-2">
                      {heroCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className="max-w-full rounded-full border border-white/20 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition md:hover:bg-white md:hover:text-blue-700"
                          onClick={() => selectCategory(category)}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {!isStoreOwner ? (
            <div id="store-info">
              <PublicStoreLocationSection
                locations={locations}
                socialLinks={{
                  instagram: store.socialInstagram ?? undefined,
                  tiktok: store.socialTiktok ?? undefined,
                }}
              />
            </div>
          ) : null}
          {modernCategoriesSection}
          {modernProductsSection}
        </div>
        <SiteFooter {...footer} />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-white pb-[calc(88px+env(safe-area-inset-bottom))] text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:pb-0">
      <CustomStorefrontHeader
        store={store}
        storeHomeHref={storeHomeHref}
        searchQuery={searchQuery}
      />
      <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-8 md:gap-10 lg:px-8 lg:py-10">
        {isStoreOwner ? (
          <StoreBrandingQuickEdit store={store} />
        ) : (
          <section className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/70 sm:gap-6 sm:rounded-[20px] sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.8fr)] lg:items-center lg:p-8">
            <div className="min-w-0">
              <div className="mb-4 flex min-w-0 items-center gap-3 sm:mb-5">
                <StoreLogo store={store} className="size-16 shrink-0 rounded-2xl border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 sm:size-20" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300 sm:text-xs sm:tracking-[0.18em]">
                    Online mağaza
                  </p>
                  <h1 className="mt-1 line-clamp-2 break-words text-[30px] font-semibold leading-tight tracking-normal text-slate-950 dark:text-white sm:text-[38px] lg:text-[44px]">
                    {store.name}
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl break-words text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base sm:leading-7">
                {store.description || heroSubtitle}
              </p>
              <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
                <Button
                  type="button"
                  className="h-11 rounded-[10px] bg-blue-600 px-5 text-sm font-semibold text-white shadow-none md:hover:bg-blue-700"
                  onClick={() => scrollToSection("products")}
                >
                  Məhsullara bax
                </Button>
                {locations.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-[10px] border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 shadow-none md:hover:border-blue-200 md:hover:bg-blue-50 md:hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    onClick={() => scrollToSection("contact")}
                  >
                    Əlaqə
                  </Button>
                ) : null}
              </div>
              <MarketplaceSearch
                stores={[store]}
                defaultValue={searchQuery}
                storeSlug={store.slug}
                searchBaseHref={storeHomeHref}
                resultsAnchorId="products"
                className="mt-4 max-w-xl rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 sm:mt-6 sm:p-1.5"
                inputClassName="h-11 rounded-[12px] border-transparent bg-transparent pl-10 text-[16px] text-slate-900 placeholder:text-slate-500 focus-visible:ring-0 dark:text-slate-100 sm:h-12 sm:pl-11"
                buttonClassName="!size-11 !min-w-11 rounded-[10px] bg-blue-600 p-0 text-white md:hover:bg-blue-700"
                buttonSize="lg"
                stackOnMobile
                compactActions
              />
              {customHeroCategories.length > 0 ? (
                <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-4 sm:flex-wrap sm:overflow-visible">
                  {customHeroCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="flex h-8 shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition md:hover:border-blue-200 md:hover:bg-blue-50 md:hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:h-auto sm:px-3.5 sm:py-2 sm:text-xs"
                      onClick={() => selectCategory(category)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative hidden min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:block">
              <div className="aspect-[4/3] w-full">
                <StoreHeroCover store={store} />
              </div>
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/40 bg-slate-950/82 p-4 text-white shadow-[0_18px_40px_rgba(2,6,23,0.28)] backdrop-blur">
                <p className="text-xs font-medium text-white/60">Mağaza</p>
                <p className="mt-1 line-clamp-2 break-words text-lg font-semibold">
                  {heroSubtitle}
                </p>
              </div>
            </div>
          </section>
        )}

        {modernCategoriesSection}
        {modernProductsSection}
        {!isStoreOwner ? (
          <div id="contact" className="scroll-mt-24">
            <PublicStoreLocationSection
              locations={locations}
              socialLinks={{
                instagram: store.socialInstagram ?? undefined,
                tiktok: store.socialTiktok ?? undefined,
              }}
            />
          </div>
        ) : null}
      </div>
      <CustomStoreFooter store={store} storeHomeHref={storeHomeHref} />
    </main>
  );
}
