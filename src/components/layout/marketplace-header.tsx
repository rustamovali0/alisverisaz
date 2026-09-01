"use client";

import {
  Heart,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import type { AuthRole } from "@/lib/auth/types";
import { showToast } from "@/lib/toast";
import { Link, usePathname } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { MobileNavbarVariant } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";

type MarketplaceHeaderProps = {
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

export function MarketplaceHeader({
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
}: MarketplaceHeaderProps) {
  const nav = useTranslations("nav");
  const common = useTranslations("common");
  const displaySiteName = formatBrandName(siteName);
  const pathname = usePathname();
  const { profile, isResolved } = useClientAuthProfileState();
  const isHomePage =
    pathname === storeHomeHref ||
    (Boolean(storeSubdomainSlug) && pathname === `/${storeSubdomainSlug}`);
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
    pathname.startsWith("/register");
  const isProductsActive = pathname === productsHref || pathname.startsWith(`${productsHref}/`);
  const isAboutActive = pathname.startsWith("/about");
  const [isHomeSearchVisible, setIsHomeSearchVisible] = useState(isHomePage);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const commerceUtilityButtonClass =
    "group inline-flex size-10 items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-slate-950 shadow-none transition duration-200 hover:translate-y-0 hover:!border-transparent hover:!bg-transparent hover:text-blue-600 hover:shadow-none dark:border-transparent dark:text-white dark:hover:!border-transparent dark:hover:text-blue-300 md:size-11";
  const commerceUtilityIconClass =
    "size-6 min-h-6 min-w-6 stroke-[2.3] transition-transform duration-200 md:group-hover:scale-105";
  const sellerCommerceIconClass =
    "size-6 stroke-[2.3] transition-transform duration-200 md:group-hover:scale-105 min-[400px]:size-7";
  const mobileCommerceIconClass =
    "size-6 stroke-[2.3] transition-transform duration-200";

  function showLoginRequiredToast() {
    showToast({
      title: "Giriş tələb olunur",
      description: "Zəhmət olmasa əvvəlcə giriş edin.",
      variant: "info",
    });
  }

  useEffect(() => {
    if (!isHomePage) {
      setIsHomeSearchVisible(false);
      return;
    }

    let observer: IntersectionObserver | null = null;
    const frame = window.requestAnimationFrame(() => {
      const sentinel = document.querySelector("[data-home-search-sentinel]");
      if (!sentinel) {
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
    };
  }, [isHomePage]);

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
  const shouldShowCompactMobileSearch = !isHomePage || !isHomeSearchVisible;
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
  }, [pathname]);

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
        <div className="container flex min-h-16 w-full max-w-[1280px] min-w-0 flex-wrap items-center gap-2 py-2 sm:min-h-[68px] sm:gap-3 xl:flex-nowrap">
          <Link href={brandHomeHref} prefetch className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            {logoUrl ? (
              <span className="grid size-9 place-items-center overflow-hidden rounded-lg border border-cyan-100 bg-white shadow-sm dark:border-cyan-200/20 md:size-10 md:rounded-md">
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
              <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-lg font-black text-white shadow-sm dark:bg-white dark:text-slate-950 md:size-10 md:rounded-md md:text-lg">
                a
              </span>
            )}
            <span className="min-w-0 origin-left truncate text-[23px] font-bold tracking-normal text-slate-950 transition-transform duration-200 dark:text-slate-100 md:text-xl md:font-black md:group-hover:scale-105">
              {displaySiteName}
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1 md:hidden">
            <LanguageSwitcher />
            {shouldShowMobileSearchToggle ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={commerceUtilityButtonClass}
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
            <ThemeToggle
              className={commerceUtilityButtonClass}
              iconClassName={mobileCommerceIconClass}
            />
            <NotificationCenter
              requireAuth={isGuest}
              buttonClassName={commerceUtilityButtonClass}
              iconClassName={mobileCommerceIconClass}
            />
            {isSeller && !isHomePage ? (
              <>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "max-[374px]:hidden",
                    commerceUtilityButtonClass,
                  )}
                  aria-label={nav("favorites")}
                >
                  <Link href="/favorites" prefetch className="grid place-items-center">
                    <Heart className={mobileCommerceIconClass} aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className={commerceUtilityButtonClass}
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
          <nav className="hidden min-w-0 items-center gap-1 lg:flex">
            <Button
              asChild
              variant={isProductsActive ? "secondary" : "ghost"}
              className={cn(
                "group rounded-lg bg-transparent px-3 text-sm font-medium text-slate-700 shadow-none hover:!bg-transparent hover:text-blue-600 dark:bg-transparent dark:text-slate-200 dark:hover:!bg-transparent dark:hover:text-blue-300",
                isProductsActive && "bg-transparent text-slate-900 dark:bg-transparent dark:text-slate-100",
              )}
            >
              <Link href={productsHref} prefetch>
                <span className="inline-block transition-transform duration-200 md:group-hover:scale-105">
                  {nav("products")}
                </span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="group rounded-lg bg-transparent px-3 text-sm font-medium text-slate-700 shadow-none hover:!bg-transparent hover:text-blue-600 dark:bg-transparent dark:text-slate-200 dark:hover:!bg-transparent dark:hover:text-blue-300"
            >
              <Link href="/stores" prefetch>
                <span className="inline-block transition-transform duration-200 md:group-hover:translate-y-[-1px]">
                  Mağazalar
                </span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="group rounded-lg bg-transparent px-3 text-sm font-medium text-slate-700 shadow-none hover:!bg-transparent hover:text-blue-600 dark:bg-transparent dark:text-slate-200 dark:hover:!bg-transparent dark:hover:text-blue-300"
            >
              <Link href="/categories" prefetch>
                <span className="inline-block transition-transform duration-200 md:group-hover:translate-y-[-1px]">
                  Kateqoriyalar
                </span>
              </Link>
            </Button>
            <Button
              asChild
              variant={isAboutActive ? "secondary" : "ghost"}
              className={cn(
                "group rounded-lg bg-transparent px-3 text-sm font-medium text-slate-700 shadow-none hover:!bg-transparent hover:text-blue-600 dark:bg-transparent dark:text-slate-200 dark:hover:!bg-transparent dark:hover:text-blue-300",
                isAboutActive && "bg-transparent text-slate-900 dark:bg-transparent dark:text-slate-100",
              )}
            >
              <Link href="/about" prefetch>
                <span className="inline-block transition-transform duration-200 md:group-hover:scale-105">
                  {nav("about")}
                </span>
              </Link>
            </Button>
          </nav>
          {shouldShowDesktopSearch ? (
            <div className="ml-auto hidden min-w-[360px] flex-[1.4_1_0] items-center gap-3 md:flex xl:max-w-[720px]">
              <MarketplaceSearch
                stores={stores}
                defaultValue={searchDefaultValue}
                storeSlug={searchStoreSlug ?? undefined}
                className="min-w-0 flex-1 rounded-[14px] border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900"
                inputClassName="h-10 rounded-xl border-0 bg-slate-50 pl-11 pr-4 text-slate-800 shadow-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:bg-slate-900 dark:text-slate-100"
                buttonClassName="rounded-[10px] bg-blue-600 px-5 text-white hover:bg-blue-700"
              />
            </div>
          ) : null}
          <div className="ml-auto hidden items-center gap-1 md:flex">
            <LanguageSwitcher className="hidden lg:flex" />
            <ThemeToggle
              className={cn(
                commerceUtilityButtonClass,
              )}
              iconClassName={isSeller ? sellerCommerceIconClass : commerceUtilityIconClass}
            />
            <NotificationCenter
              requireAuth={isGuest}
              buttonClassName={cn(
                commerceUtilityButtonClass,
              )}
              iconClassName={isSeller ? sellerCommerceIconClass : commerceUtilityIconClass}
            />
            <Button
              size="icon"
              variant="ghost"
              type={isGuest ? "button" : undefined}
              asChild={!isGuest}
              onClick={isGuest ? showLoginRequiredToast : undefined}
              className={cn(
                commerceUtilityButtonClass,
              )}
              aria-label={nav("favorites")}
            >
              {isGuest ? (
                <Heart className={isSeller ? sellerCommerceIconClass : commerceUtilityIconClass} aria-hidden="true" />
              ) : (
                <Link href="/favorites" prefetch className="grid place-items-center">
                  <Heart className={isSeller ? sellerCommerceIconClass : commerceUtilityIconClass} aria-hidden="true" />
                </Link>
              )}
            </Button>
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
            <div className="hidden min-w-[168px] lg:block">
              <HeaderAccountActions />
            </div>
          </div>
        </div>
      </header>
      {showMobileSearch &&
      !shouldSuppressSearch &&
      shouldShowCompactMobileSearch &&
      hasSearchData &&
      (!shouldGateMobileSearch || isMobileSearchOpen) ? (
        <div className="mobile-performance-surface sticky top-16 z-40 border-b bg-white px-4 py-1.5 shadow-sm shadow-slate-950/[0.03] dark:bg-background md:hidden">
          <MarketplaceSearch
            stores={stores}
            defaultValue={searchDefaultValue}
            storeSlug={searchStoreSlug ?? undefined}
            stackOnMobile
            className="w-full"
            inputClassName="h-9 rounded-xl border-0 bg-slate-100 pl-11 pr-3 text-[16px] shadow-none placeholder:text-[15px] focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketplace-primary)/0.3)] dark:bg-muted"
          />
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

export { MarketplaceHeader as PublicHeader };
