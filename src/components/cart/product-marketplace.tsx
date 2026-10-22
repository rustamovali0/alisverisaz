"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { productQueryOptions } from "@/lib/query/product-options";
import dynamic from "next/dynamic";
import { OptimizedImage } from "@/components/common/optimized-image";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { useTranslations } from "next-intl";

import { AddToCartButton } from "@/components/cart/cart-buttons";
import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { EmptyState } from "@/components/common/empty-state";
import { GlobalLoader } from "@/components/common/global-loader";
import { FavoriteToggleButton } from "@/components/favorites/favorite-toggle-button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { PublicStoreLocationSection } from "@/components/locations/public-store-location-section";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StoreWhatsAppButton } from "@/components/store/store-whatsapp-button";
const StoreBrandingQuickEdit = dynamic(() => import("@/components/store/store-branding-quick-edit").then((module) => module.StoreBrandingQuickEdit));
import { InstagramBrandIcon, TikTokIcon } from "@/components/icons/social-icons";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import type {
  CartProduct,
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
  Crown,
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

function updateFilterQuery(key: string, value: string | boolean) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (value === "" || value === false) url.searchParams.delete(key);
  else url.searchParams.set(key, value === true ? "1" : value);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function readFilterQuery() {
  if (typeof window === "undefined") return null;
  const query = new URL(window.location.href).searchParams;
  return {
    color: query.get("color") ?? "",
    size: query.get("size") ?? "",
    minPrice: query.get("minPrice") ?? "",
    maxPrice: query.get("maxPrice") ?? "",
    inStockOnly: query.get("inStock") === "1",
  };
}

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
  storeSubdomainSlug?: string | null;
  productsOnly?: boolean;
  contactOnly?: boolean;
};

const DEFAULT_MARKETPLACE_BANNER_URL = "/auth/auth-banner.webp";
const DEFAULT_STICKY_SCROLL_OFFSET = 96;

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
    <OptimizedImage
      src={store.logoUrl}
      alt={store.name}
      width={160}
      height={160}
      sizes="(max-width: 640px) 64px, 112px"
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

function StoreHeroCover({
  store,
  isolated = false,
}: {
  store: MarketplaceStore;
  isolated?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const coverUrl =
    (isolated ? store.storefrontHeroUrl : null) ||
    store.coverUrl ||
    DEFAULT_MARKETPLACE_BANNER_URL;

  if (hasError) {
    return (
      <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#eff6ff,#f8fafc)] dark:bg-[linear-gradient(135deg,#111827,#020617)]">
        <Store className="size-12 text-blue-300 dark:text-blue-500/60" aria-hidden="true" />
      </div>
    );
  }

  return (
    <OptimizedImage
      src={coverUrl}
      alt={store.name}
      fill
      sizes="(max-width: 1024px) 100vw, 60vw"
      fetchPriority="high"
      style={{
        "--store-banner-position": `${store.bannerPositionX ?? 50}% ${store.bannerPositionY ?? 50}%`,
      } as CSSProperties}
      className={cn(
        "h-full w-full object-contain object-top sm:object-cover sm:object-[var(--store-banner-position)]",
        coverUrl !== DEFAULT_MARKETPLACE_BANNER_URL ? "bg-slate-100 dark:bg-slate-950" : "",
      )}
      onError={() => setHasError(true)}
    />
  );
}

function getStickyScrollOffset() {
  if (typeof document === "undefined") {
    return DEFAULT_STICKY_SCROLL_OFFSET;
  }

  const header = document.querySelector<HTMLElement>("[data-storefront-header]");

  return Math.max(header?.offsetHeight ?? DEFAULT_STICKY_SCROLL_OFFSET, DEFAULT_STICKY_SCROLL_OFFSET) + 18;
}

function scrollToPageSection(sectionId: string, updateHash = false) {
  if (typeof window === "undefined") {
    return;
  }

  const section = document.getElementById(sectionId);

  if (!section) {
    return;
  }

  const top = section.getBoundingClientRect().top + window.scrollY - getStickyScrollOffset();

  window.scrollTo({
    top: Math.max(top, 0),
    behavior: "smooth",
  });

  if (updateHash) {
    const url = new URL(window.location.href);
    url.hash = sectionId;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function scheduleScrollToPageSection(sectionId: string, updateHash = false) {
  if (typeof window === "undefined") {
    return;
  }

  let attempts = 0;
  let settledFrames = 0;

  function scrollWhenReady() {
    attempts += 1;
    const section = document.getElementById(sectionId);

    if (section) {
      settledFrames += 1;
    }

    if ((section && settledFrames >= 2) || attempts >= 8) {
      scrollToPageSection(sectionId, updateHash);
      return;
    }

    window.requestAnimationFrame(scrollWhenReady);
  }

  window.requestAnimationFrame(scrollWhenReady);
}

function scrollToPageTop(updateUrl?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  if (updateUrl) {
    window.history.replaceState(null, "", updateUrl);
  }
}

function normalizeStoreSocialHref(kind: "instagram" | "tiktok", value?: string | null) {
  const cleanValue = value?.trim();

  if (!cleanValue) {
    return "";
  }

  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }

  const handle = cleanValue.replace(/^@/, "");

  return kind === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://tiktok.com/@${handle}`;
}

export function CustomStorefrontHeader({
  store,
  storeHomeHref,
  searchQuery,
  onNavigateSection,
  storeSubdomainSlug,
  isolatedStorefront = false,
}: {
  store: MarketplaceStore;
  storeHomeHref: string;
  searchQuery?: string;
  onNavigateSection?: (sectionId: string) => void;
  storeSubdomainSlug?: string | null;
  isolatedStorefront?: boolean;
}) {
  const storefront = useTranslations("storefront");
  const cartHref = isolatedStorefront
    ? `${storeHomeHref === "/" ? "" : storeHomeHref}/cart`
    : "/cart";
  const { profile } = useClientAuthProfileState();
  const isAuthenticated = profile.status === "authenticated";
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const aboutContent = getStoreAboutContent(store);
  const navItems = [
    { href: storeHomeHref, label: storefront("home") },
    { href: `${storeHomeHref === "/" ? "" : storeHomeHref}/products`, label: storefront("products") },
    { href: `${storeHomeHref === "/" ? "" : storeHomeHref}#store-categories`, label: storefront("categories") },
    ...(aboutContent
      ? [{ href: `${storeHomeHref === "/" ? "" : storeHomeHref}#about`, label: storefront("about") }]
      : []),
    { href: `${storeHomeHref === "/" ? "" : storeHomeHref}/contact`, label: storefront("contact") },
  ];
  const socialLinks = [
    {
      key: "instagram" as const,
      label: "Instagram",
      href: normalizeStoreSocialHref("instagram", store.socialInstagram),
      icon: InstagramBrandIcon,
    },
    {
      key: "tiktok" as const,
      label: "TikTok",
      href: normalizeStoreSocialHref("tiktok", store.socialTiktok),
      icon: TikTokIcon,
    },
  ].filter((item) => item.href);
  const iconButtonClass =
    "group grid size-12 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent p-0 text-slate-950 shadow-none transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 md:hover:!border-transparent md:hover:!bg-transparent md:hover:text-blue-600 md:hover:shadow-none dark:border-transparent dark:text-white dark:md:hover:!border-transparent dark:md:hover:text-blue-300 [&_svg]:!size-8";
  const storefrontIconClass = "!size-8 min-h-8 min-w-8 stroke-[2.15] transition-transform duration-200 md:group-hover:scale-105";

  useEffect(() => {
    function updateHeaderSearchVisibility() {
      setShowHeaderSearch(window.scrollY > 160);
    }

    updateHeaderSearchVisibility();
    window.addEventListener("scroll", updateHeaderSearchVisibility, { passive: true });

    return () => window.removeEventListener("scroll", updateHeaderSearchVisibility);
  }, []);

  return (
    <header
      data-storefront-header
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
    >
      <div className="container mx-auto flex min-h-16 w-full max-w-[1440px] min-w-0 items-center gap-2 px-4 sm:min-h-[68px] sm:gap-2.5 sm:px-6 lg:px-8">
        <Link
          href={storeHomeHref}
          prefetch
          className="flex min-w-0 flex-[1_1_auto] items-center gap-2.5 sm:gap-3 lg:flex-[0_1_300px] xl:flex-[0_1_340px] 2xl:flex-[0_1_420px]"
        >
          <StoreLogo store={store} className="size-10 shrink-0 rounded-xl border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900 sm:size-11" />
          <span className="min-w-0 truncate text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl 2xl:text-[27px]">
            {store.name}
          </span>
        </Link>
        <nav
          className="ml-2 hidden shrink-0 items-center gap-0.5 lg:flex"
        >
          {navItems.map((item) => {
            const hashIndex = item.href.indexOf("#");
            const sectionId = hashIndex >= 0 ? item.href.slice(hashIndex + 1) : null;

            return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition md:hover:bg-slate-50 md:hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-slate-300 dark:md:hover:bg-slate-900 dark:md:hover:text-white 2xl:px-3"
              onClick={(event) => {
                if (typeof window === "undefined") {
                  return;
                }

                const targetUrl = new URL(item.href, window.location.href);
                if (targetUrl.pathname !== window.location.pathname) {
                  return;
                }

                event.preventDefault();
                if (sectionId) {
                  onNavigateSection?.(sectionId);
                  scheduleScrollToPageSection(sectionId, true);
                } else {
                  scrollToPageTop(item.href);
                }
              }}
            >
              {item.label}
            </Link>
            );
          })}
        </nav>
        <div className="hidden shrink-0 lg:block">
          {!isolatedStorefront ? <HeaderAccountActions showSellerCta={false} customerOnlyRegister /> : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 2xl:ml-0">
          {socialLinks.length > 0 ? (
            <div className="hidden shrink-0 items-center gap-1 xl:flex">
              {socialLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Button
                    key={item.key}
                    asChild
                    variant="ghost"
                    size="icon"
                    className={iconButtonClass}
                    aria-label={item.label}
                  >
                    <a href={item.href} target="_blank" rel="noreferrer">
                      <Icon className={storefrontIconClass} aria-hidden="true" />
                    </a>
                  </Button>
                );
              })}
            </div>
          ) : null}
          {isAuthenticated && !isolatedStorefront ? (
            <Button asChild variant="ghost" size="icon" className={iconButtonClass} aria-label={storefront("favorites")}>
              <Link href="/favorites" prefetch>
                <Heart className={storefrontIconClass} aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="icon" className={iconButtonClass} aria-label={storefront("cart")}>
            <Link href={cartHref} prefetch>
              <ShoppingCart className={storefrontIconClass} aria-hidden="true" />
            </Link>
          </Button>
          <ThemeToggle className={iconButtonClass} iconClassName={storefrontIconClass} />
        </div>
      </div>
      {showHeaderSearch ? (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[680px]">
            <MarketplaceSearch
              stores={[store]}
              defaultValue={searchQuery}
              storeSlug={store.slug}
              searchBaseHref={storeHomeHref}
              resultsAnchorId="products"
              stackOnMobile
              compactActions
              className="rounded-xl border border-slate-200 bg-white p-1 shadow-none dark:border-slate-800 dark:bg-slate-950"
              inputClassName="h-10 rounded-lg border-0 bg-slate-50 pl-10 text-[16px] text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-200 dark:bg-slate-900 dark:text-slate-100"
              buttonClassName="!size-10 !min-w-10 rounded-lg bg-blue-600 p-0 text-white md:hover:bg-blue-700"
              buttonSize="lg"
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}

function getDisplayStoreDescription(store: MarketplaceStore) {
  const description = store.description?.trim();

  if (!description) {
    return null;
  }

  const normalizedDescription = description
    .toLocaleLowerCase("az-AZ")
    .replace(/\s+/g, " ");
  const hiddenDefaultDescriptions = new Set(["satıcı mağazası", "satici magazasi"]);

  return hiddenDefaultDescriptions.has(normalizedDescription) ? null : description;
}

function getStoreAboutContent(store: MarketplaceStore) {
  return store.aboutContent?.trim() || null;
}

export function CustomStoreFooter({
  store,
  storeHomeHref,
}: {
  store: MarketplaceStore;
  storeHomeHref: string;
}) {
  const storefront = useTranslations("storefront");
  const baseHref = storeHomeHref === "/" ? "" : storeHomeHref;
  const description = getDisplayStoreDescription(store);
  const aboutContent = getStoreAboutContent(store);

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 pb-6 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <StoreLogo store={store} className="size-11 shrink-0 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            <h2 className="truncate text-2xl font-semibold text-slate-950 dark:text-slate-100">
              {store.name}
            </h2>
          </div>
          {description ? (
            <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          ) : null}
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm font-medium text-slate-600 dark:text-slate-300 sm:flex sm:items-center">
          <Link href={storeHomeHref} prefetch className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
            {storefront("home")}
          </Link>
          <Link href={`${baseHref}/products`} className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
            {storefront("products")}
          </Link>
          <Link href={`${baseHref}#store-categories`} className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
            {storefront("categories")}
          </Link>
          {aboutContent ? (
            <Link href={`${baseHref}#about`} className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
              {storefront("about")}
            </Link>
          ) : null}
          <Link href={`${baseHref}/contact`} className="md:hover:text-blue-700 dark:md:hover:text-blue-300">
            {storefront("contact")}
          </Link>
        </nav>
      </div>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-4 border-t border-slate-200 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 text-center dark:border-slate-800 sm:px-6 md:pb-6 lg:px-8">
        <a
          href="https://alisveris.az"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition md:hover:bg-blue-700 dark:bg-white dark:text-slate-950 dark:md:hover:bg-blue-200"
        >
          alisveris.az saytına keç
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} {store.name}. Bütün hüquqlar qorunur.
        </p>
      </div>
    </footer>
  );
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

function getDescendantCategoryIds(categories: CategoryOption[], categoryId?: string) {
  if (!categoryId) {
    return [];
  }

  const ids = new Set([categoryId]);
  let changed = true;

  while (changed) {
    changed = false;
    categories.forEach((category) => {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    });
  }

  return [...ids];
}

function getScopedCategoryOptions(categories: CategoryOption[], selectedCategoryId?: string) {
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const children = selectedCategory
    ? categories.filter((category) => category.parentId === selectedCategory.id)
    : [];

  if (children.length > 0) {
    return selectedCategory ? [selectedCategory, ...children] : children;
  }

  if (selectedCategory?.parentId) {
    return categories.filter((category) => category.parentId === selectedCategory.parentId);
  }

  return categories.filter((category) => !category.parentId);
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
          "flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white text-left font-semibold text-slate-900 transition md:hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
          compact ? "h-9 px-2.5 text-xs sm:h-10 sm:px-3 sm:text-sm" : "h-10 px-3 text-sm",
        )}
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
            "absolute left-0 top-[calc(100%+0.35rem)] z-30 max-h-72 w-full min-w-[14rem] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950",
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
                  "flex w-full items-center justify-between gap-2 rounded-md text-left text-slate-800 transition md:hover:bg-blue-50 dark:text-slate-100 dark:md:hover:bg-blue-950/30",
                  compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
                  selected && "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
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
  priceError,
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
  priceError?: string;
  layout?: "stacked" | "wide";
}) {
  const t = useTranslations("marketplace");
  const isWide = layout === "wide";

  return (
    <section className={cn("relative z-20 w-full rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-card", isWide ? "p-3 md:p-4" : "p-2.5")}>
      <h2 className={cn("text-xs font-bold text-slate-950 dark:text-slate-100", isWide ? "mb-3" : "mb-2")}>{t("filters")}</h2>
      <div className={cn(isWide ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(12rem,0.9fr)] lg:items-center" : "space-y-2")}>
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
            value={minPrice === "0" ? "" : minPrice}
            onChange={(event) => onMinPrice(event.target.value === "0" ? "" : event.target.value)}
            placeholder={t("minPrice")}
            aria-label={t("minPrice")}
            className={cn("h-9 min-w-0 w-1/2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100", !isWide && "sm:w-24")}
          />
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={maxPrice === "0" ? "" : maxPrice}
            onChange={(event) => onMaxPrice(event.target.value === "0" ? "" : event.target.value)}
            placeholder={t("maxPrice")}
            aria-label={t("maxPrice")}
            className={cn("h-9 min-w-0 w-1/2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100", !isWide && "sm:w-24")}
          />
        </div>
        {priceError ? <p className="text-xs font-medium text-rose-600 lg:col-span-5" role="alert">{priceError}</p> : null}

        <label className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
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
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category, index) => {
          const Icon = getCategoryIcon(category);
          const iconStyle = CATEGORY_ICON_STYLES[index % CATEGORY_ICON_STYLES.length];

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category)}
              className="group flex min-h-[52px] min-w-0 touch-manipulation items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-200 ease-out active:scale-[0.98] dark:border-slate-800 dark:bg-card"
            >
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg ring-1", iconStyle)}>
                <Icon className="size-4 stroke-[2.2]" aria-hidden="true" />
              </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-[13px] font-semibold leading-5 text-slate-700 dark:text-muted-foreground">
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
  isolatedStoreSlug,
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
  isolatedStoreSlug?: string;
}) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const isLiquidGlass = productCardVariant === "liquid-glass";
  const [clientNow, setClientNow] = useState<number | null>(null);

  useEffect(() => {
    setClientNow(Date.now());
  }, []);

  if (products.length === 0) {
    return (
      <EmptyState
        className="min-h-80"
        title={t("noStoreProducts")}
        description={t("noProductsForCategory")}
      />
    );
  }

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
          clientNow !== null &&
          Number.isFinite(createdTime) &&
          createdTime > 0 &&
          clientNow - createdTime < 14 * 24 * 60 * 60 * 1000;

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
          onClick={openDetail}
          className={cn(
            "product-card group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,border-color,box-shadow] duration-200 ease-out [contain:layout_paint_style] [content-visibility:auto] [contain-intrinsic-size:340px] dark:border-slate-800 dark:bg-card dark:text-slate-100 md:hover:-translate-y-0.5 md:hover:border-slate-300 md:hover:shadow-[0_8px_30px_rgba(15,23,42,0.07)]",
            compactMobileCards && "max-sm:rounded-xl",
            isLiquidGlass &&
              "liquid-glass-product-card border-white/70 bg-white/60 dark:border-white/10 dark:bg-white/10 md:hover:border-cyan-200/80",
          )}
        >
          <Link
            href={detailHref}
            className="block"
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
                <OptimizedImage
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1023px) 50vw, (max-width: 1279px) 25vw, 320px"
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
                {product.isPromoted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[11px] font-black text-slate-950 shadow-sm">
                    <Crown className="size-3" aria-hidden="true" />
                    Önə çıxarılıb
                  </span>
                ) : null}
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
          {!isolatedStoreSlug ? <FavoriteToggleButton
            productId={product.id}
            productName={product.name}
            compact
            className="absolute right-2 top-2 z-20 size-9 border-border bg-card/95 text-foreground shadow-sm"
          /> : null}
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
                product.stockTrackingEnabled === false && "hidden",
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
                    <Link href={`/sell/product/${product.id}/edit`}>
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
                    isolatedStoreSlug={isolatedStoreSlug}
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
  initialProducts, initialCursor, initialHasMore, locale,
  categoryId, categoryIds, storeId, searchQuery, sort, pageSize,
}: {
  initialProducts: CartProduct[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  locale: string;
  categoryId?: string;
  categoryIds?: string[];
  storeId?: string;
  searchQuery?: string;
  sort?: MarketplaceProductSort;
  pageSize?: number;
}) {
  const options = productQueryOptions({ locale, categoryId, categoryIds, storeId, searchQuery, sort, pageSize });
  const key = JSON.stringify(options.queryKey);
  // Server data belongs only to the filters active when this view first mounted.
  const initialKey = useRef(key);
  const query = useInfiniteQuery({
    ...options,
    initialData: key === initialKey.current ? {
      pages: [{ products: initialProducts, nextCursor: initialCursor ?? null, hasMore: Boolean(initialHasMore) }],
      pageParams: [null],
    } : undefined,
  });
  return {
    products: (query.data?.pages ?? []).reduce<CartProduct[]>((all, page) => mergeProducts(all, page.products), []),
    hasMore: Boolean(query.hasNextPage),
    isLoadingNext: query.isPending || query.isFetchingNextPage,
    loadNext: () => {
      if (query.hasNextPage && !query.isFetching) void query.fetchNextPage();
    },
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
  isolatedStoreSlug,
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
  isolatedStoreSlug?: string;
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
        isolatedStoreSlug={isolatedStoreSlug}
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
  const categoryQueryIds = useMemo(
    () => getDescendantCategoryIds(categories, activeCategoryId),
    [activeCategoryId, categories],
  );
  const visibleCategoryOptions = useMemo(
    () => getScopedCategoryOptions(categories, activeCategoryId),
    [activeCategoryId, categories],
  );
  const infinite = useInfiniteProducts({
    initialProducts: products,
    initialCursor: nextCursor,
    initialHasMore: hasMore,
    locale,
    categoryId: activeCategoryId,
    categoryIds: categoryQueryIds,
    searchQuery,
    sort: activeSort,
  });
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
    const invalidRange = min !== null && max !== null && min > max;

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

      if (!invalidRange && min !== null && Number.isFinite(min) && finalPrice < min) {
        return false;
      }

      if (!invalidRange && max !== null && Number.isFinite(max) && finalPrice > max) {
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
  const priceError = minPrice && maxPrice && Number(minPrice) > Number(maxPrice)
    ? "Minimum qiymət maksimum qiymətdən böyük ola bilməz."
    : "";

  useEffect(() => {
    setActiveCategoryId(selectedCategoryId);
    setActiveSort(sort);
    const saved = readFilterQuery();
    if (saved) {
      setColorFilter(saved.color);
      setSizeFilter(saved.size);
      setMinPrice(saved.minPrice);
      setMaxPrice(saved.maxPrice);
      setInStockOnly(saved.inStockOnly);
    }
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
    ["color", "size", "minPrice", "maxPrice", "inStock"].forEach((key) => updateFilterQuery(key, ""));
  }

  const filterBar = (
    <MarketplaceFilterBar
      categories={visibleCategoryOptions}
      selectedCategoryId={activeCategoryId}
      colors={variantFilterValues.colors}
      sizes={variantFilterValues.sizes}
      color={colorFilter}
      size={sizeFilter}
      minPrice={minPrice}
      maxPrice={maxPrice}
      inStockOnly={inStockOnly}
      priceError={priceError}
      onCategory={selectCategory}
      onColor={(value) => { setColorFilter(value); updateFilterQuery("color", value); }}
      onSize={(value) => { setSizeFilter(value); updateFilterQuery("size", value); }}
      onMinPrice={(value) => { setMinPrice(value); updateFilterQuery("minPrice", value); }}
      onMaxPrice={(value) => { setMaxPrice(value); updateFilterQuery("maxPrice", value); }}
      onStockOnly={(value) => { setInStockOnly(value); updateFilterQuery("inStock", value); }}
    />
  );

  const productGrid = (
    visibleProducts.length === 0 && !infinite.hasMore && !infinite.isLoadingNext ? (
      <EmptyState
        className="min-h-96"
        title={searchQuery || hasActiveProductFilters ? "Axtarışınıza uyğun məhsul tapılmadı" : labels.emptyTitle}
        description={searchQuery || hasActiveProductFilters ? "Filtrləri təmizləyin və ya başqa axtarış sözü yoxlayın." : labels.emptyDescription}
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
        <div className="min-w-0">
          <section className="mx-auto min-w-0 w-full max-w-[1180px] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card">
              <h1 className="text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
                {labels.title}
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
              <div id="marketplace-filters" className="relative z-20 w-full">
                <MarketplaceFilterBar
                  categories={visibleCategoryOptions}
                  selectedCategoryId={activeCategoryId}
                  colors={variantFilterValues.colors}
                  sizes={variantFilterValues.sizes}
                  color={colorFilter}
                  size={sizeFilter}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  inStockOnly={inStockOnly}
                  priceError={priceError}
                  onCategory={selectCategory}
                  onColor={(value) => { setColorFilter(value); updateFilterQuery("color", value); }}
                  onSize={(value) => { setSizeFilter(value); updateFilterQuery("size", value); }}
                  onMinPrice={(value) => { setMinPrice(value); updateFilterQuery("minPrice", value); }}
                  onMaxPrice={(value) => { setMaxPrice(value); updateFilterQuery("maxPrice", value); }}
                  onStockOnly={(value) => { setInStockOnly(value); updateFilterQuery("inStock", value); }}
                  layout="wide"
                />
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
  storeSubdomainSlug,
  productsOnly = false,
  contactOnly = false,
}: StorefrontProps) {
  const t = useTranslations("marketplace");
  const home = useTranslations("home");
  const storefront = useTranslations("storefront");
  const [activeCategoryId, setActiveCategoryId] = useState(selectedCategoryId);
  const [activeSort, setActiveSort] = useState<MarketplaceProductSort>("newest");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showAllMobileCategories, setShowAllMobileCategories] = useState(false);
  const [homeProductLimit, setHomeProductLimit] = useState(4);
  const [isOwnerEditing, setIsOwnerEditing] = useState(false);
  const infinite = useInfiniteProducts({
    initialProducts: store.sampleProducts,
    initialCursor: store.productNextCursor,
    initialHasMore: store.productHasMore,
    locale,
    categoryId: activeCategoryId,
    storeId: store.id,
    searchQuery,
    sort: activeSort,
    pageSize: productsOnly ? 20 : 4,
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
    const invalidRange = min !== null && max !== null && min > max;

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

      if (!invalidRange && min !== null && Number.isFinite(min) && finalPrice < min) {
        return false;
      }

      if (!invalidRange && max !== null && Number.isFinite(max) && finalPrice > max) {
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
  const storefrontPriceError = minPrice && maxPrice && Number(minPrice) > Number(maxPrice)
    ? "Minimum qiymət maksimum qiymətdən böyük ola bilməz."
    : "";

  useEffect(() => {
    setActiveCategoryId(selectedCategoryId);
    const saved = readFilterQuery();
    if (saved) {
      setColorFilter(saved.color);
      setSizeFilter(saved.size);
      setMinPrice(saved.minPrice);
      setMaxPrice(saved.maxPrice);
      setInStockOnly(saved.inStockOnly);
    }
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
  const sortedStoreCategories = useMemo(() => {
    const available = categories.filter((category) => storeProductCategoryIds.has(category.id));
    const featuredOrder = new Map((store.featuredCategoryIds ?? []).map((id, index) => [id, index]));
    return available.sort((a, b) => {
      const aOrder = featuredOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = featuredOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.name.localeCompare(b.name, "az");
    });
  }, [categories, store.featuredCategoryIds, storeProductCategoryIds]);
  const primaryStoreCategory = sortedStoreCategories.find((category) =>
    storeProductCategoryIds.has(category.id),
  );
  const heroCategories = sortedStoreCategories.slice(0, 5);
  const heroSubtitle = getStoreHeroSubtitle(store, primaryStoreCategory?.name);
  const storeContactPhone = store.whatsappPhone || store.phone ||
    locations.find((location) => location.isActive && location.phone)?.phone;
  const selectedFeaturedCategories = (store.featuredCategoryIds?.length ?? 0) > 0
    ? sortedStoreCategories.filter((category) => store.featuredCategoryIds?.includes(category.id))
    : sortedStoreCategories;
  const customHeroCategories = selectedFeaturedCategories.slice(0, 4);
  const customHeroDescription = getDisplayStoreDescription(store);
  const aboutContent = getStoreAboutContent(store);

  function selectCategory(category?: CategoryOption, options?: { scrollToProducts?: boolean }) {
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
    if (options?.scrollToProducts ?? true) {
      scheduleScrollToPageSection("products");
    }
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
    ["color", "size", "minPrice", "maxPrice", "inStock"].forEach((key) => updateFilterQuery(key, ""));
  }

  function scrollToSection(sectionId: string) {
    scheduleScrollToPageSection(sectionId, true);
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
      priceError={storefrontPriceError}
      onCategory={selectCategory}
      onColor={(value) => { setColorFilter(value); updateFilterQuery("color", value); }}
      onSize={(value) => { setSizeFilter(value); updateFilterQuery("size", value); }}
      onMinPrice={(value) => { setMinPrice(value); updateFilterQuery("minPrice", value); }}
      onMaxPrice={(value) => { setMaxPrice(value); updateFilterQuery("maxPrice", value); }}
      onStockOnly={(value) => { setInStockOnly(value); updateFilterQuery("inStock", value); }}
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
      compact
    />
  );

  const productsSection = (
    <section id="products" className="mt-4 min-w-0 scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card md:mt-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="break-words text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
          {t("storeProducts")}
        </h2>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant={isFiltersOpen ? "default" : "outline"}
            className="h-9 gap-1.5 rounded-[9px] px-2.5 text-xs sm:h-10 sm:gap-2 sm:rounded-[10px] sm:px-3 sm:text-sm"
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
            className="h-9 rounded-[9px] px-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-950 sm:h-10 sm:rounded-[10px] sm:px-3 sm:text-sm"
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
            isStoreOwner={isStoreOwner && isOwnerEditing}
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
          "min-w-0 scroll-mt-28 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card",
          "p-3 sm:p-4",
        )}
      >
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-xl">
              {legacyLayout ? home("categories") : storefront("featuredCategories")}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-blue-600 transition md:hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-blue-300 dark:md:hover:text-blue-200 sm:text-sm"
            onClick={() => {
              if (isCustomStorefront) {
                setShowAllMobileCategories((current) => !current);
                scheduleScrollToPageSection("store-categories");
                return;
              }

              selectCategory();
            }}
          >
            {showAllMobileCategories ? storefront("showLess") : storefront("viewAll")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="-mx-3 grid min-w-0 grid-flow-col grid-rows-2 auto-cols-[164px] snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-rows-none sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5 xl:grid-cols-6">
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
                  "group flex min-h-[52px] w-[164px] min-w-0 shrink-0 snap-start items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left shadow-none transition duration-200 md:hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-slate-800 dark:bg-background dark:text-slate-100 sm:w-auto",
                  isCustomStorefront && !showAllMobileCategories && index >= 12 && "hidden sm:flex",
                  !hasProducts && "text-muted-foreground opacity-70",
                  isSelected && "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-200",
                )}
                onClick={() =>
                  selectCategory(category, { scrollToProducts: !isCustomStorefront })
                }
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg ring-1", iconStyle)}>
                  <Icon className="size-4 stroke-[2.1]" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-1.5">
                  <span className="line-clamp-2 min-w-0 break-words text-xs font-semibold leading-4 text-slate-950 dark:text-slate-100 sm:text-[13px]">
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
          "min-w-0 scroll-mt-28",
          productsOnly
            ? "rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:p-8"
            :
          isCustomStorefront
            ? "border-0 bg-transparent px-0 py-2 shadow-none"
            : "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card sm:p-5 lg:p-6",
        )}
      >
      <div className={cn("grid min-w-0 gap-3 lg:flex lg:items-end lg:justify-between", isCustomStorefront ? "mb-4 sm:mb-5" : "mb-5")}>
        <div className="min-w-0">
          {productsOnly ? (
            <h1 className="truncate text-[22px] font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
              Bütün məhsullar
            </h1>
          ) : (
            <h2 className="truncate text-[22px] font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
              {home("recentlyListed")}
            </h2>
          )}
          {productsOnly ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Məhsulları filtr və sıralama ilə rahat tapın
            </p>
          ) : null}
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1.5 sm:flex sm:items-center sm:justify-end sm:gap-2">
          <Button
            type="button"
            variant={isFiltersOpen ? "default" : "outline"}
            className={cn(
              "h-9 gap-1.5 rounded-[9px] px-2.5 text-xs shadow-none sm:h-11 sm:gap-2 sm:rounded-[10px] sm:px-3 sm:text-sm",
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
              "h-9 rounded-[9px] px-2.5 text-xs text-slate-500 md:hover:bg-slate-100 md:hover:text-slate-950 disabled:opacity-45 dark:md:hover:bg-slate-900 dark:md:hover:text-slate-100 sm:h-11 sm:rounded-[10px] sm:px-3 sm:text-sm",
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
        products={productsOnly ? filteredVisibleProducts : filteredVisibleProducts.slice(0, homeProductLimit)}
        hasMore={!hasLocalFilters && (productsOnly ? infinite.hasMore : homeProductLimit < filteredVisibleProducts.length || infinite.hasMore)}
        isLoadingNext={!hasLocalFilters && infinite.isLoadingNext}
        onLoadNext={() => {
          if (productsOnly) {
            infinite.loadNext();
            return;
          }
          setHomeProductLimit((current) => current + 4);
          if (homeProductLimit >= filteredVisibleProducts.length) infinite.loadNext();
        }}
        storeSlug={store.slug}
        storeName={store.name}
        storeBaseHref={storeBaseHref}
        productCardVariant={productCardVariant}
        labels={{ stock: labels.stock }}
        isStoreOwner={isStoreOwner && isOwnerEditing}
        forceMobileTwoColumns
        compactMobileCards={isCustomStorefront}
        isolatedStoreSlug={isCustomStorefront ? store.slug : undefined}
      />
    </section>
  );

  const aboutSection = aboutContent ? (
    <section
      id="about"
      className={cn(
        "min-w-0 scroll-mt-28 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card",
        isCustomStorefront ? "p-3.5 sm:p-5 lg:p-6" : "p-4 sm:p-5 lg:p-6",
      )}
    >
      <div className="mb-3 flex min-w-0 items-center gap-3 sm:mb-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-900/40">
          <Store className="size-5" aria-hidden="true" />
        </span>
        <h2 className="truncate text-[22px] font-semibold tracking-normal text-slate-950 dark:text-slate-100 sm:text-2xl">
          {storefront("aboutStore")}
        </h2>
      </div>
      <div className="whitespace-pre-line break-words text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        {aboutContent}
      </div>
    </section>
  ) : null;

  const ownerEditControl = isStoreOwner ? (
    <div className="mb-4 flex justify-end">
      <Button
        type="button"
        variant={isOwnerEditing ? "outline" : "default"}
        className="h-10 gap-2 rounded-xl px-4 font-semibold shadow-sm"
        onClick={() => setIsOwnerEditing((current) => !current)}
      >
        <Pencil className="size-4" aria-hidden="true" />
        {isOwnerEditing ? "Redaktəni bağla" : "Redaktə et"}
      </Button>
    </div>
  ) : null;

  const customCategorySection = sortedStoreCategories.length > 0 ? (
    <section id="store-categories" className="min-w-0 scroll-mt-28 py-2 sm:py-4">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
            {storefront("store")}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {storefront("featuredCategories")}
          </h2>
        </div>
        <button
          type="button"
          className="shrink-0 text-sm font-semibold text-slate-600 transition md:hover:text-blue-600 dark:text-slate-300 dark:md:hover:text-blue-300"
          onClick={() => setShowAllMobileCategories((current) => !current)}
        >
          {showAllMobileCategories ? storefront("showLess") : storefront("viewAll")}
        </button>
      </div>
      <div className={cn(
        "-mx-4 flex min-w-0 snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-6",
        showAllMobileCategories && "grid grid-cols-2 overflow-visible",
      )}>
        {sortedStoreCategories.map((category, index) => {
          const Icon = getCategoryIcon(category);
          const hasProducts = storeProductCategoryIds.has(category.id);

          return (
            <button
              key={category.id}
              type="button"
              className={cn(
                "group relative min-h-[116px] w-[148px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-slate-200 bg-white p-3.5 text-left shadow-[0_8px_26px_rgba(15,23,42,0.05)] transition duration-300 md:hover:-translate-y-1 md:hover:border-blue-200 md:hover:shadow-[0_16px_38px_rgba(37,99,235,0.10)] dark:border-slate-800 dark:bg-slate-900 sm:min-h-[132px] sm:w-auto sm:p-4",
                showAllMobileCategories && "w-auto",
                !showAllMobileCategories && index >= 6 && "sm:hidden lg:block",
                !hasProducts && "opacity-65",
                activeCategoryId === category.id && "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30",
              )}
              onClick={() => selectCategory(category, { scrollToProducts: true })}
            >
              <span className={cn("grid size-10 place-items-center rounded-xl ring-1 sm:size-11 sm:rounded-2xl", CATEGORY_ICON_STYLES[index % CATEGORY_ICON_STYLES.length])}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-4 flex items-end justify-between gap-2 sm:mt-5">
                <span className="line-clamp-2 text-sm font-bold leading-5 text-slate-900 dark:text-white">
                  {category.name}
                </span>
                <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform md:group-hover:translate-x-1 md:group-hover:text-blue-600" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  ) : null;

  if (!isCustomStorefront) {
    return (
      <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 px-4 py-4 pb-[calc(88px+env(safe-area-inset-bottom))] dark:bg-slate-950 sm:px-6 sm:py-8 md:pb-10 lg:px-8 lg:py-10">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-8 md:gap-10">
          {ownerEditControl}
          {isStoreOwner && isOwnerEditing ? (
            <div className="relative min-w-0">
              <StoreBrandingQuickEdit store={store} />
              <StoreWhatsAppButton phone={storeContactPhone} />
            </div>
          ) : (
            <section className="min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-card sm:p-4">
              <div className="relative overflow-hidden rounded-[19px] bg-slate-950 sm:rounded-2xl">
                <div className="relative h-[190px] sm:h-[280px] lg:h-[340px]">
                  <StoreHeroCover store={store} />
                  <StoreWhatsAppButton phone={storeContactPhone} />
                  <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.78),rgba(15,23,42,0.42),rgba(2,6,23,0.64))]" aria-hidden="true" />
                </div>
                <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 sm:p-6 lg:p-8">
                  <div className="grid min-w-0 gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-end">
                    <div className="flex min-w-0 items-end gap-3 sm:gap-5">
                      <StoreLogo store={store} className="size-16 shrink-0 rounded-xl border-2 border-white bg-white shadow-[0_14px_32px_rgba(2,6,23,0.22)] sm:size-24 sm:rounded-2xl lg:size-28" />
                      <div className="min-w-0 pb-1 text-white">
                        <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.18em] text-white/70 sm:block">
                          {storefront("marketplaceStore")}
                        </p>
                        <h1 className="line-clamp-2 break-words pb-1 text-2xl font-semibold leading-[1.16] tracking-normal sm:text-4xl lg:text-[44px]">
                          {store.name}
                        </h1>
                        <p className="mt-2 hidden break-words text-sm font-medium text-white/80 sm:block sm:text-base">
                          {heroSubtitle}
                        </p>
                      </div>
                    </div>
                    <div data-store-search-sentinel className="min-w-0">
                      <MarketplaceSearch
                        stores={[store]}
                        defaultValue={searchQuery}
                        storeSlug={store.slug}
                        searchBaseHref={storeHomeHref}
                        className="rounded-[12px] bg-white p-1 shadow-[0_12px_35px_rgba(2,6,23,0.18)] sm:rounded-[14px] sm:p-1.5"
                        inputClassName="h-10 rounded-[10px] border-transparent bg-transparent pl-10 text-[15px] text-slate-900 placeholder:text-slate-500 focus-visible:ring-0 sm:h-12 sm:rounded-[12px] sm:pl-11 sm:text-[16px]"
                        buttonClassName="!size-10 !min-w-10 rounded-[9px] bg-blue-600 p-0 text-white md:hover:bg-blue-700 sm:!size-11 sm:!min-w-11 sm:rounded-[10px]"
                        buttonSize="lg"
                        stackOnMobile
                        compactActions
                      />
                      {aboutContent ? (
                        <div className="mt-3 hidden justify-end sm:flex">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-full border-white/35 bg-white/95 px-4 text-sm font-semibold text-slate-950 shadow-sm md:hover:bg-white md:hover:text-blue-700"
                            onClick={() => scrollToSection("about")}
                          >
                            {storefront("learnAboutStore")}
                            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {heroCategories.length > 0 ? (
                    <div className="mt-5 hidden max-w-full flex-wrap gap-2 sm:flex">
                      {heroCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className="max-w-full rounded-full border border-white/20 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition md:hover:bg-white md:hover:text-blue-700"
                          onClick={() =>
                            selectCategory(category, {
                              scrollToProducts: !isCustomStorefront,
                            })
                          }
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

          {modernCategoriesSection}
          {aboutSection}
          {modernProductsSection}
          <div id="store-info">
              <PublicStoreLocationSection
                locations={locations}
                logoUrl={store.logoUrl}
                storeName={store.name}
                socialLinks={{
                  instagram: store.socialInstagram ?? undefined,
                  tiktok: store.socialTiktok ?? undefined,
                }}
              />
          </div>
        </div>
        <SiteFooter {...footer} />
      </main>
    );
  }

  if (productsOnly || contactOnly) {
    return (
      <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 pb-[calc(76px+env(safe-area-inset-bottom))] text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:pb-0">
        <div className={cn(
          "mx-auto w-full max-w-[1440px] px-4 pb-5 sm:px-6 md:pb-8 lg:px-8",
    "pt-20 sm:pt-14 md:pt-12",
        )}>
          {productsOnly ? ownerEditControl : null}
          {productsOnly && isStoreOwner && isOwnerEditing ? (
            <div className="mb-5">
              <StoreBrandingQuickEdit store={store} />
            </div>
          ) : null}
          {productsOnly ? modernProductsSection : (
            <PublicStoreLocationSection
              locations={locations}
              logoUrl={store.logoUrl}
              storeName={store.name}
              isolated
              socialLinks={{ instagram: store.socialInstagram ?? undefined, tiktok: store.socialTiktok ?? undefined }}
            />
          )}
        </div>
        <CustomStoreFooter store={store} storeHomeHref={storeHomeHref} />
        <MobileBottomNav storeHomeHref={storeHomeHref} storeSubdomainSlug={storeSubdomainSlug} storeId={store.id} isolatedStorefront />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-white pb-[calc(76px+env(safe-area-inset-bottom))] text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:pb-0">
      <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-7 px-4 py-4 sm:px-6 sm:py-7 md:gap-10 lg:px-8 lg:py-9">
        {ownerEditControl}
        {isStoreOwner && isOwnerEditing ? (
          <div className="relative min-w-0">
            <StoreBrandingQuickEdit store={store} />
            <StoreWhatsAppButton phone={storeContactPhone} />
          </div>
        ) : (
          <section data-store-search-sentinel className="-mx-4 flex min-w-0 flex-col sm:mx-0">
            <div className="order-2 grid overflow-hidden bg-[#edf4ff] dark:bg-slate-900 lg:order-1 lg:min-h-[520px] lg:grid-cols-[0.88fr_1.12fr]">
              <div className="relative z-10 order-2 flex min-w-0 flex-col justify-center px-5 py-4 sm:px-10 sm:py-10 lg:order-1 lg:px-14 lg:py-14 xl:px-20">
                <StoreLogo store={store} className="mb-4 hidden size-16 rounded-none border-0 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.10)] sm:grid sm:mb-6 sm:size-20 lg:mb-7 lg:size-24" />
                <h1 className="max-w-xl text-2xl font-black leading-[1.1] tracking-[-0.035em] text-slate-950 dark:text-white sm:text-4xl lg:text-[54px]">
                  {store.heroTitle?.trim() || storefront("heroTitle")}
                </h1>
                {store.heroSubtitle?.trim() || customHeroDescription ? (
                  <p className="mt-3 hidden line-clamp-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300 sm:block sm:mt-5 sm:text-base sm:leading-7 lg:text-lg lg:leading-8">
                    {store.heroSubtitle?.trim() || customHeroDescription}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-7 sm:gap-3">
                  <Button
                    type="button"
                    className="h-11 rounded-none bg-slate-950 px-5 text-sm font-bold text-white shadow-none md:hover:bg-blue-700 dark:bg-white dark:text-slate-950 dark:md:hover:bg-blue-100 sm:h-12 sm:px-7"
                    onClick={() => scrollToSection("products")}
                  >
                    {storefront("browseProducts")}
                    <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                  </Button>
                  {locations.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="hidden h-11 rounded-none border-slate-400 bg-transparent px-5 text-sm font-bold text-slate-900 shadow-none md:hover:border-slate-950 md:hover:bg-white dark:border-slate-600 dark:text-white dark:md:hover:bg-slate-800 sm:inline-flex sm:h-12 sm:px-7"
                      onClick={() => scrollToSection("contact")}
                    >
                      {storefront("contact")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="relative order-1 min-h-[180px] overflow-hidden sm:min-h-[320px] lg:order-2 lg:min-h-[520px]">
                <StoreHeroCover store={store} isolated />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" aria-hidden="true" />
                <StoreWhatsAppButton phone={storeContactPhone} />
                {customHeroCategories.length > 0 ? (
                  <div className="absolute inset-x-4 bottom-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inset-x-7 sm:bottom-7">
                    {customHeroCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="h-9 shrink-0 bg-white px-3.5 text-[11px] font-bold text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.16)] transition md:hover:bg-blue-600 md:hover:text-white sm:h-10 sm:px-4 sm:text-xs"
                        onClick={() => selectCategory(category, { scrollToProducts: true })}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="order-1 border-y border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 sm:p-5 lg:order-2 lg:border-x lg:border-t-0">
              <MarketplaceSearch
                stores={[store]}
                defaultValue={searchQuery}
                storeSlug={store.slug}
                searchBaseHref={storeHomeHref}
                resultsAnchorId="products"
                className="mx-auto max-w-4xl rounded-none border-0 bg-slate-100 p-1 shadow-none dark:bg-slate-900 sm:p-1.5"
                inputClassName="h-10 rounded-none border-transparent bg-transparent pl-10 text-[15px] text-slate-900 placeholder:text-slate-500 focus-visible:ring-0 dark:text-slate-100 sm:h-12 sm:pl-11 sm:text-[16px]"
                buttonClassName="!h-10 !min-w-10 rounded-none bg-slate-950 px-3 text-white md:hover:bg-blue-700 dark:bg-blue-600 sm:!h-12 sm:!min-w-12 sm:px-5"
                buttonSize="lg"
                stackOnMobile
                compactActions
              />
            </div>
          </section>
        )}

        {modernProductsSection}
        {customCategorySection}
        {aboutSection}
        <div id="contact" className="scroll-mt-28">
            <PublicStoreLocationSection
              locations={locations}
              logoUrl={store.logoUrl}
              storeName={store.name}
              isolated
              socialLinks={{
                instagram: store.socialInstagram ?? undefined,
                tiktok: store.socialTiktok ?? undefined,
              }}
            />
        </div>
      </div>
      <CustomStoreFooter store={store} storeHomeHref={storeHomeHref} />
      <MobileBottomNav storeHomeHref={storeHomeHref} storeSubdomainSlug={storeSubdomainSlug} storeId={store.id} isolatedStorefront={isCustomStorefront} />
    </main>
  );
}
