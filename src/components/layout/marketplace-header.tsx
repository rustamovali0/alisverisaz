"use client";

import {
  Heart,
  ShoppingCart,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { SellProductButton } from "@/components/auth/sell-product-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
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

function formatBrandName(value?: string) {
  if (!value || value.toLocaleLowerCase("az-AZ").includes("alisveris")) {
    return "Alışveriş";
  }

  return value;
}

export function MarketplaceHeader({
  siteName = "Alışveriş",
  logoUrl,
  darkLogoUrl,
  stores = [],
  categories = [],
  searchDefaultValue,
  showMobileSearch = false,
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
  const isSellerDashboard =
    pathname === "/store/dashboard" || pathname.startsWith("/store/dashboard/");
  const isProductsActive = pathname === productsHref || pathname.startsWith(`${productsHref}/`);
  const isAboutActive = pathname.startsWith("/about");
  const [isHomeSearchVisible, setIsHomeSearchVisible] = useState(isHomePage);
  const sellerUtilityButtonClass =
    "size-12 rounded-xl !border-0 !bg-transparent !shadow-none hover:!bg-muted hover:!text-primary min-[400px]:size-14";
  const sellerUtilityIconClass = "size-7 stroke-[2.5] min-[400px]:size-8";

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

  const shouldShowCompactMobileSearch = !isHomePage || !isHomeSearchVisible;

  return (
    <>
      <header
        className={
          sticky
            ? cn(
                "marketplace-header relative z-40 border-b border-cyan-100 bg-white/98 shadow-sm shadow-teal-950/[0.04] md:sticky md:top-0",
                !isHomePage && "bg-white/95",
              )
            : "marketplace-header relative z-40 border-b border-cyan-100 bg-white/95 shadow-sm shadow-teal-950/[0.04]"
        }
      >
        <div className="container flex w-full max-w-full min-w-0 flex-wrap items-center gap-2 py-3 sm:gap-3 xl:flex-nowrap">
          <Link href={brandHomeHref} prefetch className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            {logoUrl ? (
              <span className="grid size-10 place-items-center overflow-hidden rounded-lg border border-cyan-100 bg-white shadow-sm md:size-10 md:rounded-md">
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
              <span className="grid size-10 place-items-center rounded-lg bg-slate-950 text-lg font-black text-white shadow-sm md:size-10 md:rounded-md md:text-lg">
                a
              </span>
            )}
            <span className="min-w-0 truncate text-xl font-black tracking-normal text-slate-950 min-[400px]:text-2xl md:text-xl">
              {displaySiteName}
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1 md:hidden">
            <ThemeToggle
              className={cn(
                "size-12 rounded-xl border bg-background text-foreground shadow-sm transition duration-200 hover:bg-background hover:text-primary min-[400px]:size-14",
                isSeller && sellerUtilityButtonClass,
              )}
              iconClassName={isSeller ? sellerUtilityIconClass : "size-7 min-[400px]:size-8"}
            />
            <NotificationCenter
              buttonClassName={cn(
                "size-12 rounded-xl border bg-background text-foreground shadow-sm min-[400px]:size-14",
                isSeller && sellerUtilityButtonClass,
              )}
              iconClassName={isSeller ? sellerUtilityIconClass : "size-7 min-[400px]:size-8"}
            />
            {isSeller ? (
              <>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "size-10 rounded-xl border bg-background text-foreground shadow-sm min-[400px]:size-12 max-[374px]:hidden",
                    sellerUtilityButtonClass,
                  )}
                  aria-label={nav("favorites")}
                >
                  <Link href="/favorites" prefetch className="grid place-items-center">
                    <Heart className={sellerUtilityIconClass} aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "size-12 rounded-xl border bg-background text-foreground shadow-sm min-[400px]:size-14",
                    sellerUtilityButtonClass,
                  )}
                  aria-label={common("cart")}
                >
                  <Link href="/cart" prefetch className="grid place-items-center">
                    <ShoppingCart className={sellerUtilityIconClass} aria-hidden="true" />
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
                "rounded-full px-4 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800",
                isProductsActive && "bg-cyan-50 text-cyan-800",
              )}
            >
              <Link href={productsHref} prefetch>
                {nav("products")}
              </Link>
            </Button>
            <Button
              asChild
              variant={isAboutActive ? "secondary" : "ghost"}
              className={cn(
                "rounded-full px-4 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800",
                isAboutActive && "bg-cyan-50 text-cyan-800",
              )}
            >
              <Link href="/about" prefetch>
                {nav("about")}
              </Link>
            </Button>
          </nav>
          {!isSellerDashboard ? (
            <div className="ml-auto hidden min-w-[360px] flex-[1.4_1_0] items-center gap-3 md:flex xl:max-w-[720px]">
              <MarketplaceSearch
                stores={stores}
                defaultValue={searchDefaultValue}
                storeSlug={searchStoreSlug ?? undefined}
                className="min-w-0 flex-1 rounded-full border border-cyan-100 bg-white p-1 shadow-sm"
                inputClassName="h-10 rounded-full border-0 bg-[#f6fbfa] pl-11 pr-4 text-slate-800 shadow-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                buttonClassName="rounded-full bg-[#0f7f8f] px-5 text-white hover:bg-[#0c6c79]"
              />
            </div>
          ) : null}
          <div className="ml-auto hidden items-center gap-1 md:flex">
            <LanguageSwitcher className="hidden lg:flex" />
            <ThemeToggle
              className={cn(
                "size-12 rounded-xl border border-cyan-100 bg-cyan-50/55 text-slate-900 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 hover:shadow-md md:size-12",
                isSeller && sellerUtilityButtonClass,
              )}
              iconClassName={isSeller ? sellerUtilityIconClass : "h-6 w-6 min-h-6 min-w-6 stroke-[2.4] md:size-6"}
            />
            <NotificationCenter
              buttonClassName={cn(
                "size-12 rounded-xl border border-cyan-100 bg-cyan-50/55 text-slate-900 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-800 hover:shadow-md",
                isSeller && sellerUtilityButtonClass,
              )}
              iconClassName={isSeller ? sellerUtilityIconClass : "h-6 w-6 min-h-6 min-w-6 stroke-[2.4]"}
            />
            <Button
              asChild
              size="icon"
              variant="ghost"
              className={cn(
                "size-12 rounded-xl border border-cyan-100 bg-cyan-50/55 text-slate-900 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-800 hover:shadow-md",
                isSeller && sellerUtilityButtonClass,
              )}
              aria-label={nav("favorites")}
            >
              <Link href="/favorites" prefetch className="grid place-items-center">
                <Heart className={isSeller ? sellerUtilityIconClass : "h-6 w-6 min-h-6 min-w-6 stroke-[2.4]"} aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="icon"
              variant="ghost"
              className={cn(
                "size-12 rounded-xl border border-cyan-100 bg-cyan-50/55 text-slate-900 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-800 hover:shadow-md",
                isSeller && sellerUtilityButtonClass,
              )}
              aria-label={common("cart")}
            >
              <Link href="/cart" prefetch className="grid place-items-center">
                <ShoppingCart className={isSeller ? sellerUtilityIconClass : "h-6 w-6 min-h-6 min-w-6 stroke-[2.4]"} aria-hidden="true" />
              </Link>
            </Button>
            <div className="hidden min-w-[168px] lg:block">
              <HeaderAccountActions />
            </div>
            <div className="hidden md:block">
              <SellProductButton />
            </div>
          </div>
        </div>
      </header>
      {showMobileSearch && !isSellerDashboard && shouldShowCompactMobileSearch && (stores.length > 0 || categories.length > 0) ? (
        <div className="mobile-performance-surface sticky top-0 z-40 border-b bg-white px-4 py-1.5 shadow-sm shadow-slate-950/[0.03] dark:bg-background md:hidden">
          <MarketplaceSearch
            stores={stores}
            defaultValue={searchDefaultValue}
            storeSlug={searchStoreSlug ?? undefined}
            stackOnMobile
            className="w-full"
            inputClassName="h-9 rounded-xl border-0 bg-slate-100 pl-11 pr-4 text-[16px] shadow-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketplace-primary)/0.3)] dark:bg-muted"
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
