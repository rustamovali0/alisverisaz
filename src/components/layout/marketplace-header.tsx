"use client";

import {
  Heart,
  ShoppingCart,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { SellProductButton } from "@/components/auth/sell-product-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { MobileNavbarVariant } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";

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
  sticky = true,
}: MarketplaceHeaderProps) {
  const nav = useTranslations("nav");
  const common = useTranslations("common");
  const displaySiteName = formatBrandName(siteName);
  const pathname = usePathname();
  const isProductsActive = pathname.startsWith("/products");
  const isAboutActive = pathname.startsWith("/about");

  return (
    <>
      <header
        className={sticky ? "marketplace-header relative z-40 border-b bg-background/95 shadow-sm shadow-slate-950/[0.03] md:sticky md:top-0" : "marketplace-header relative z-40 border-b bg-background/95 shadow-sm shadow-slate-950/[0.03]"}
      >
        <div className="container flex w-full max-w-full min-w-0 flex-wrap items-center gap-3 py-3 xl:flex-nowrap">
          <Link href="/" prefetch className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            {logoUrl ? (
              <span className="grid size-12 place-items-center overflow-hidden rounded-xl border bg-background shadow-sm md:size-10 md:rounded-md">
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
              <span className="grid size-12 place-items-center rounded-xl bg-primary text-xl font-black text-primary-foreground shadow-sm md:size-10 md:rounded-md md:text-lg">
                a
              </span>
            )}
            <span className="min-w-0 truncate text-2xl font-black tracking-normal md:text-xl">
              {displaySiteName}
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2 md:hidden">
            <NotificationCenter
              buttonClassName="size-12 rounded-xl border bg-background text-foreground shadow-sm"
              iconClassName="size-7"
            />
          </div>
          <nav className="hidden min-w-0 items-center gap-1 lg:flex">
            <Button asChild variant={isProductsActive ? "secondary" : "ghost"}>
              <Link href="/products" prefetch>
                {nav("products")}
              </Link>
            </Button>
            <Button asChild variant={isAboutActive ? "secondary" : "ghost"}>
              <Link href="/about" prefetch>
                {nav("about")}
              </Link>
            </Button>
          </nav>
          <div className="ml-auto hidden min-w-[360px] flex-[1.4_1_0] items-center gap-3 md:flex xl:max-w-[720px]">
            <MarketplaceSearch
              stores={stores}
              categories={categories}
              defaultValue={searchDefaultValue}
              className="min-w-0 flex-1"
            />
          </div>
          <div className="ml-auto hidden items-center gap-1 md:flex">
            <LanguageSwitcher className="hidden lg:flex" />
            <NotificationCenter
              buttonClassName="size-12 rounded-xl border bg-background text-foreground transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md"
              iconClassName="h-6 w-6 min-h-6 min-w-6 stroke-[2.4]"
            />
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-12 rounded-xl border bg-background text-foreground transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md"
              aria-label={nav("favorites")}
            >
              <Link href="/favorites" prefetch className="grid place-items-center">
                <Heart className="h-6 w-6 min-h-6 min-w-6 stroke-[2.4]" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-12 rounded-xl border bg-background text-foreground transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md"
              aria-label={common("cart")}
            >
              <Link href="/cart" prefetch className="grid place-items-center">
                <ShoppingCart className="h-6 w-6 min-h-6 min-w-6 stroke-[2.4]" aria-hidden="true" />
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
      {showMobileSearch && (stores.length > 0 || categories.length > 0) ? (
        <div className="mobile-performance-surface sticky top-0 z-40 border-b bg-white px-4 py-1.5 shadow-sm shadow-slate-950/[0.03] dark:bg-background md:hidden">
          <MarketplaceSearch
            stores={stores}
            categories={categories}
            defaultValue={searchDefaultValue}
            stackOnMobile
            className="w-full"
            inputClassName="h-9 rounded-xl border-0 bg-slate-100 pl-11 pr-4 text-[16px] shadow-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketplace-primary)/0.3)] dark:bg-muted"
          />
        </div>
      ) : null}
      {showBottomNav ? <MobileBottomNav variant={mobileNavbarVariant} /> : null}
    </>
  );
}

export { MarketplaceHeader as PublicHeader };
