"use client";

import {
  BadgePlus,
  ChevronDown,
  Heart,
  HelpCircle,
  Info,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShoppingCart,
  Store,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { InstagramBrandIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import type { AuthRole } from "@/lib/auth/types";
import { Link, usePathname } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { MobileNavbarVariant } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";
import { rtestDesignEnabled } from "@/lib/config/rtest-design";
import { RtestMarketplaceHeader } from "@/components/layout/rtest-marketplace-header";

export type MarketplaceHeaderProps = {
  siteName?: string;
  logoUrl?: string;
  darkLogoUrl?: string;
  stores?: MarketplaceStore[];
  categories?: CategoryOption[];
  searchDefaultValue?: string;
  showMobileSearch?: boolean;
  compactMobileSearch?: boolean;
  showBottomNav?: boolean;
  mobileNavbarVariant?: MobileNavbarVariant;
  storeSubdomainSlug?: string | null;
  storeHomeHref?: string;
  brandHomeHref?: string;
  productsHref?: string;
  searchStoreSlug?: string | null;
  initialRole?: AuthRole | null;
  sticky?: boolean;
  instagramUrl?: string;
  whatsappUrl?: string;
};

const CART_KEY = "alisveris_cart";

function formatBrandName(value?: string) {
  if (!value || value.toLocaleLowerCase("az-AZ").includes("alisveris")) {
    return "Alışveriş";
  }

  return value;
}

function readCartCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as Array<{
      quantity?: number;
    }>;

    return items.reduce((sum, item) => sum + Math.max(Number(item.quantity) || 0, 0), 0);
  } catch {
    return 0;
  }
}

function normalizeInstagramHref(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://instagram.com/${trimmed.replace(/^@/, "")}`;
}

function normalizeWhatsappHref(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const phone = trimmed.replace(/[^\d]/g, "");

  return phone ? `https://wa.me/${phone}` : "";
}

function LegacyMarketplaceHeader({
  siteName = "Alışveriş",
  logoUrl,
  darkLogoUrl,
  stores = [],
  categories = [],
  searchDefaultValue,
  showMobileSearch = false,
  compactMobileSearch = false,
  showBottomNav = true,
  mobileNavbarVariant,
  storeSubdomainSlug,
  storeHomeHref = "/",
  brandHomeHref = storeHomeHref,
  productsHref = "/products",
  searchStoreSlug,
  initialRole,
  sticky = true,
  instagramUrl,
  whatsappUrl,
}: MarketplaceHeaderProps) {
  const nav = useTranslations("nav");
  const common = useTranslations("common");
  const displaySiteName = formatBrandName(siteName);
  const pathname = usePathname();
  const { profile, isResolved } = useClientAuthProfileState();
  const isMarketplaceStoreLanding =
    /^\/store\/[^/]+\/?$/.test(pathname) && !pathname.startsWith("/store/dashboard");
  const isHomePage =
    pathname === storeHomeHref ||
    (Boolean(storeSubdomainSlug) && pathname === `/${storeSubdomainSlug}`);
  const hasInlinePrimarySearch = isHomePage || isMarketplaceStoreLanding;
  const resolvedRole =
    !isResolved && initialRole
      ? initialRole
      : profile.status === "authenticated"
        ? profile.role
        : null;
  const isSeller = resolvedRole === "seller";
  const isGuest = resolvedRole === null;
  const isSellerDashboard =
    pathname === "/store/dashboard" || pathname.startsWith("/store/dashboard/");
  const shouldSuppressSearch =
    isSellerDashboard ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/radmin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");
  const [isHomeSearchVisible, setIsHomeSearchVisible] = useState(hasInlinePrimarySearch);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const instagramHref = normalizeInstagramHref(instagramUrl);
  const whatsappHref = normalizeWhatsappHref(whatsappUrl);
  const commerceUtilityButtonClass =
    "group inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-slate-950 shadow-none transition duration-200 hover:translate-y-0 hover:!border-transparent hover:!bg-transparent hover:text-[#e83e22] hover:shadow-none dark:border-transparent dark:text-white dark:hover:!border-transparent dark:hover:text-orange-300 [&_svg]:!size-6";
  const mobileUtilityButtonClass =
    "group inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-slate-950 shadow-none transition duration-200 hover:translate-y-0 hover:!border-transparent hover:!bg-transparent hover:text-[#e83e22] hover:shadow-none dark:border-transparent dark:text-white dark:hover:!border-transparent dark:hover:text-orange-300 [&_svg]:!size-5";
  const commerceUtilityIconClass =
    "!size-6 min-h-6 min-w-6 stroke-[2] transition-transform duration-200 md:group-hover:scale-105";
  const sellerCommerceIconClass =
    "!size-6 min-h-6 min-w-6 stroke-[2] transition-transform duration-200 md:group-hover:scale-105";
  const mobileCommerceIconClass =
    "!size-5 min-h-5 min-w-5 stroke-[2] transition-transform duration-200";

  useEffect(() => {
    if (!hasInlinePrimarySearch) {
      setIsHomeSearchVisible(false);
      return;
    }

    let observer: IntersectionObserver | null = null;
    let removeScrollFallback: (() => void) | null = null;
    const frame = window.requestAnimationFrame(() => {
      const sentinel = document.querySelector(
        "[data-home-search-sentinel], [data-store-search-sentinel]",
      );
      if (!sentinel) {
        const updateFallback = () => setIsHomeSearchVisible(window.scrollY < 180);
        updateFallback();
        window.addEventListener("scroll", updateFallback, { passive: true });
        removeScrollFallback = () => window.removeEventListener("scroll", updateFallback);
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => setIsHomeSearchVisible(entry?.isIntersecting ?? false),
        { rootMargin: "-74px 0px 0px 0px", threshold: 0 },
      );
      observer.observe(sentinel);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      removeScrollFallback?.();
    };
  }, [hasInlinePrimarySearch, pathname]);

  useEffect(() => {
    function syncCartCount() {
      setCartCount(readCartCount());
    }

    syncCartCount();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener("alisveris-cart-updated", syncCartCount);

    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener("alisveris-cart-updated", syncCartCount);
    };
  }, []);

  const hasSearchData = stores.length > 0 || categories.length > 0;
  const shouldShowCompactMobileSearch =
    !hasInlinePrimarySearch || !isHomeSearchVisible || isHomePage;
  const shouldShowDesktopSearch = !shouldSuppressSearch && hasSearchData;
  const pathnameSegments = pathname.split("/").filter(Boolean);
  const productsSegmentIndex = pathnameSegments.indexOf("products");
  const isProductDetailPage =
    compactMobileSearch ||
    (productsSegmentIndex !== -1 &&
      productsSegmentIndex < pathnameSegments.length - 1 &&
      !pathname.startsWith("/store/dashboard") &&
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/seller") &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/radmin"));
  const shouldGateMobileSearch = isProductDetailPage;
  const shouldShowMobileSearchToggle =
    showMobileSearch &&
    !shouldSuppressSearch &&
    shouldGateMobileSearch &&
    shouldShowCompactMobileSearch &&
    hasSearchData;

  useEffect(() => {
    setIsMobileSearchOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isMobileMenuOpen]);

  const addListingHref = isSeller
    ? "/sell/product/new"
    : isGuest
      ? "/register?role=seller&next=/store/dashboard"
      : "";
  const shouldShowAddListing = Boolean(addListingHref);
  const mobileMenuItems = [
    { href: "/products", label: nav("products"), icon: Package },
    { href: "/stores", label: "Mağazalar", icon: Store },
    { href: "/help", label: "Yardım", icon: HelpCircle },
    { href: "/about", label: "Tətbiq haqqında", icon: Info },
    { href: "/contact", label: "Bizimlə əlaqə", icon: MessageCircle },
  ];

  return (
    <>
      <header
        className={
          sticky
            ? cn(
                "marketplace-header sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-none backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
                !isHomePage && "bg-white/95 dark:bg-slate-950/95",
              )
            : "marketplace-header relative z-40 border-b border-slate-200 bg-white/95 shadow-none dark:border-slate-800 dark:bg-slate-950/95"
        }
      >
        <div
          className={cn(
            "container flex min-h-14 w-full max-w-[1440px] min-w-0 flex-nowrap items-center gap-1 py-1.5 sm:min-h-[68px] sm:gap-2 sm:py-2 xl:flex-nowrap",
            isSellerDashboard && "min-h-14 py-1.5 sm:min-h-16",
          )}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(mobileUtilityButtonClass, "md:hidden")}
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Menyunu aç"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className={mobileCommerceIconClass} aria-hidden="true" />
          </Button>
          <Link href={brandHomeHref} prefetch className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:flex-none">
            {logoUrl ? (
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 md:size-10 md:rounded-md">
                <img
                  src={logoUrl}
                  alt={displaySiteName}
                  className={darkLogoUrl ? "h-full w-full object-contain p-1.5 dark:hidden" : "h-full w-full object-contain p-1.5"}
                />
                {darkLogoUrl ? (
                  <img
                    src={darkLogoUrl}
                    alt={displaySiteName}
                    className="hidden h-full w-full object-contain p-1.5 dark:block"
                  />
                ) : null}
              </span>
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#ff4b2b] text-lg font-black text-white shadow-sm dark:bg-orange-400 dark:text-slate-950 md:size-10 md:rounded-md md:text-lg">
                a
              </span>
            )}
            <span className="min-w-0 origin-left truncate text-[19px] font-bold tracking-normal text-slate-950 transition-transform duration-200 dark:text-slate-100 min-[390px]:text-[21px] md:text-xl md:font-black md:group-hover:scale-[1.02]">
              {displaySiteName}
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 md:hidden">
            {shouldShowMobileSearchToggle ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={mobileUtilityButtonClass}
                onClick={() => setIsMobileSearchOpen((value) => !value)}
                aria-label={isMobileSearchOpen ? "Axtarışı gizlət" : "Axtarışı aç"}
                aria-expanded={isMobileSearchOpen}
              >
                <Search
                  className={mobileCommerceIconClass}
                  aria-hidden="true"
                />
              </Button>
            ) : null}
            {instagramHref ? (
              <Button
                asChild
                size="icon"
                variant="ghost"
                className={mobileUtilityButtonClass}
                aria-label="Instagram"
              >
                <a href={instagramHref} target="_blank" rel="noreferrer">
                  <InstagramBrandIcon className={mobileCommerceIconClass} />
                </a>
              </Button>
            ) : null}
            {whatsappHref ? (
              <Button
                asChild
                size="icon"
                variant="ghost"
                className={mobileUtilityButtonClass}
                aria-label="WhatsApp"
              >
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <WhatsAppIcon className={mobileCommerceIconClass} />
                </a>
              </Button>
            ) : null}
            {!isGuest ? (
              <>
                <NotificationCenter
                  buttonClassName={mobileUtilityButtonClass}
                  iconClassName={mobileCommerceIconClass}
                />
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "max-[374px]:hidden",
                    mobileUtilityButtonClass,
                  )}
                  aria-label={nav("favorites")}
                >
                  <Link href="/favorites" prefetch className="grid place-items-center">
                    <Heart className={mobileCommerceIconClass} aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : null}
            {isSeller && !isHomePage ? (
              <>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className={mobileUtilityButtonClass}
                  aria-label={common("cart")}
                >
                  <Link href="/cart" prefetch className="relative grid place-items-center">
                    <ShoppingCart className={mobileCommerceIconClass} aria-hidden="true" />
                    {cartCount > 0 ? (
                      <span className="absolute -right-1 top-1 z-10 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-black leading-none text-primary-foreground ring-2 ring-background">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    ) : null}
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
          {shouldShowDesktopSearch ? (
            <div className="ml-4 hidden min-w-[220px] max-w-[560px] flex-[1_1_360px] items-center gap-2 md:flex">
              <MarketplaceSearch
                stores={stores}
                defaultValue={searchDefaultValue}
                storeSlug={searchStoreSlug ?? undefined}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900"
                inputClassName="h-10 rounded-lg border-0 bg-slate-50 pl-11 pr-4 text-slate-800 shadow-none focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/20 dark:bg-slate-900 dark:text-slate-100"
                buttonClassName="rounded-lg bg-[#ff4b2b] px-5 text-white hover:bg-[#e83e22]"
              />
            </div>
          ) : null}
          <div className="ml-auto hidden min-w-0 shrink-0 items-center gap-1 md:flex">
            {!isGuest ? (
              <>
                <NotificationCenter
                  buttonClassName={cn(
                    commerceUtilityButtonClass,
                  )}
                  iconClassName={isSeller ? sellerCommerceIconClass : commerceUtilityIconClass}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  asChild
                  className={cn(
                    commerceUtilityButtonClass,
                  )}
                  aria-label={nav("favorites")}
                >
                  <Link href="/favorites" prefetch className="grid place-items-center">
                    <Heart className={isSeller ? sellerCommerceIconClass : commerceUtilityIconClass} aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : null}
            <Button
              asChild
              size="icon"
              variant="ghost"
              className={cn(
                commerceUtilityButtonClass,
              )}
              aria-label={common("cart")}
            >
              <Link href="/cart" prefetch className="relative grid place-items-center">
                <ShoppingCart className={isSeller ? sellerCommerceIconClass : commerceUtilityIconClass} aria-hidden="true" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 top-1 z-10 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-black leading-none text-primary-foreground ring-2 ring-background">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </Link>
            </Button>
            {isSeller && !isSellerDashboard ? (
              <Button
                asChild
                className="ml-1 hidden h-10 rounded-lg bg-[#ff4b2b] px-3 text-sm font-semibold text-white shadow-none hover:bg-[#e83e22] xl:inline-flex"
              >
                <Link href="/sell/product/new" prefetch>
                  <BadgePlus className="mr-1.5 size-4" aria-hidden="true" />
                  Məhsul əlavə et
                </Link>
              </Button>
            ) : null}
            <div className="hidden min-w-0 shrink-0 lg:block">
              <HeaderAccountActions className="shrink-0" />
            </div>
          </div>
        </div>
        <div className="hidden border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950 lg:block">
          <nav className="container flex h-11 max-w-[1440px] items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Əsas naviqasiya">
            <Link
              href="/categories"
              prefetch
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#fff0ec] hover:text-[#e83e22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/35 dark:text-slate-100 dark:hover:bg-orange-400/10 dark:hover:text-orange-300"
            >
              <Menu className="size-4" aria-hidden="true" />
              Bütün kateqoriyalar
              <ChevronDown className="size-3.5 text-slate-400" aria-hidden="true" />
            </Link>
            <Link href={productsHref} prefetch className="inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium text-slate-700 transition hover:text-[#e83e22] dark:text-slate-300 dark:hover:text-orange-300">
              {nav("products")}
            </Link>
            <Link href="/products?sort=newest" prefetch className="inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium text-slate-700 transition hover:text-[#e83e22] dark:text-slate-300 dark:hover:text-orange-300">
              Yeni gələnlər
            </Link>
            <Link href="/stores" prefetch className="inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium text-slate-700 transition hover:text-[#e83e22] dark:text-slate-300 dark:hover:text-orange-300">
              Mağazalar
            </Link>
            <Link href="/about" prefetch className="inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium text-slate-700 transition hover:text-[#e83e22] dark:text-slate-300 dark:hover:text-orange-300">
              {nav("about")}
            </Link>
          </nav>
        </div>
      </header>
      {showMobileSearch &&
      !shouldSuppressSearch &&
      shouldShowCompactMobileSearch &&
      hasSearchData &&
      (!shouldGateMobileSearch || isMobileSearchOpen) ? (
        <div className="mobile-performance-surface sticky top-14 z-40 border-b bg-white px-4 py-2 shadow-sm shadow-slate-950/[0.03] dark:bg-background md:hidden">
          <MarketplaceSearch
            stores={stores}
            defaultValue={searchDefaultValue}
            storeSlug={searchStoreSlug ?? undefined}
            stackOnMobile
            className="w-full"
            inputClassName="h-10 rounded-lg border-0 bg-slate-100 pl-11 pr-3 text-[16px] shadow-none placeholder:text-[15px] focus-visible:ring-2 focus-visible:ring-[#ff4b2b]/20 dark:bg-muted"
            buttonClassName="h-10 rounded-lg bg-[#ff4b2b] px-3 text-white hover:bg-[#e83e22]"
          />
        </div>
      ) : null}
      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[90] overscroll-contain" role="dialog" aria-modal="true" aria-label="Menyu">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Menyunu bağla"
          />
          <aside className="relative flex h-full w-[min(84vw,312px)] flex-col overflow-y-auto overscroll-contain bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 text-slate-950 shadow-2xl dark:bg-slate-950 dark:text-slate-50 md:w-[340px] md:px-5 md:pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Link
                href={brandHomeHref}
                prefetch
                className="flex min-w-0 items-center gap-2.5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {logoUrl ? (
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <img src={logoUrl} alt={displaySiteName} className="h-full w-full object-contain p-2" />
                  </span>
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff0ec] text-base font-bold text-[#e83e22] dark:bg-orange-400/10 dark:text-orange-300">
                    {displaySiteName.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 truncate text-[17px] font-bold tracking-normal">
                  {displaySiteName}
                </span>
              </Link>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 shrink-0 rounded-lg hover:bg-[#fff0ec] hover:text-[#e83e22] dark:hover:bg-orange-400/10 dark:hover:text-orange-300"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Bağla"
              >
                <X className="size-[18px]" aria-hidden="true" />
              </Button>
            </div>

            {shouldShowAddListing ? (
              <Link
                href={addListingHref}
                prefetch
                onClick={() => setIsMobileMenuOpen(false)}
                className="mb-2 inline-flex min-h-10 items-center gap-2.5 border-b border-slate-200 pb-2.5 text-[14px] font-semibold tracking-normal text-slate-800 transition hover:text-[#e83e22] dark:border-slate-800 dark:text-slate-100 dark:hover:text-orange-300"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#fff0ec] text-[#e83e22] dark:bg-orange-400/10 dark:text-orange-300">
                  <BadgePlus className="size-4" aria-hidden="true" />
                </span>
                <span>Elan yerləşdir</span>
              </Link>
            ) : null}

            <div className="grid border-b border-slate-200 dark:border-slate-800">
              {mobileMenuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex min-h-10 items-center gap-2.5 border-t border-slate-200 py-1 text-[14px] font-medium tracking-normal text-slate-800 transition first:border-t-0 hover:text-[#e83e22] dark:border-slate-800 dark:text-slate-100 dark:hover:text-orange-300"
                  >
                    <Icon className="size-[18px] shrink-0 stroke-[1.9]" aria-hidden="true" />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-3 grid gap-2">
              <div className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Dil</span>
                <LanguageSwitcher />
              </div>
              <div className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Görünüş</span>
                <ThemeToggle className="size-9 rounded-lg" iconClassName="size-4" />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
      {showBottomNav ? (
        <MobileBottomNav
          variant={mobileNavbarVariant}
          storeSubdomainSlug={storeSubdomainSlug}
          storeHomeHref={storeHomeHref}
          initialRole={initialRole}
        />
      ) : null}
    </>
  );
}

export function MarketplaceHeader(props: MarketplaceHeaderProps) {
  return rtestDesignEnabled ? <RtestMarketplaceHeader {...props} /> : <LegacyMarketplaceHeader {...props} />;
}

export { MarketplaceHeader as PublicHeader };
