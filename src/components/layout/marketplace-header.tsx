"use client";

import {
  Heart,
  ShoppingCart,
} from "lucide-react";

import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { SellProductButton } from "@/components/auth/sell-product-button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { CategoryOption } from "@/lib/products/types";

type MarketplaceHeaderProps = {
  siteName?: string;
  stores?: MarketplaceStore[];
  categories?: CategoryOption[];
  searchDefaultValue?: string;
  showMobileSearch?: boolean;
  showBottomNav?: boolean;
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
  stores = [],
  categories = [],
  searchDefaultValue,
  showMobileSearch = false,
  showBottomNav = true,
  sticky = true,
}: MarketplaceHeaderProps) {
  const displaySiteName = formatBrandName(siteName);

  return (
    <>
      <header
        className={sticky ? "sticky top-0 z-40 border-b bg-background/95 shadow-sm shadow-slate-950/[0.03] backdrop-blur" : "relative z-40 border-b bg-background/95 shadow-sm shadow-slate-950/[0.03] backdrop-blur"}
      >
        <div className="container flex w-full max-w-full min-w-0 flex-wrap items-center gap-3 py-3 xl:flex-nowrap">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-primary text-xl font-black text-primary-foreground shadow-sm md:size-10 md:rounded-md md:text-lg">
              a
            </span>
            <span className="min-w-0 truncate text-2xl font-black tracking-normal md:text-xl">
              {displaySiteName}
            </span>
          </Link>
          <nav className="hidden min-w-0 items-center gap-1 lg:flex">
            <Button asChild variant="ghost">
              <Link href="/products">Məhsullar</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/about">Haqqında</Link>
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
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-[52px] rounded-lg border bg-background"
              aria-label="Favorilər"
            >
              <Link href="/favorites">
                <Heart className="size-7" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-[52px] rounded-lg border bg-background"
              aria-label="Səbət"
            >
              <Link href="/cart">
                <ShoppingCart className="size-7" aria-hidden="true" />
              </Link>
            </Button>
            <div className="hidden min-w-[168px] lg:block">
              <HeaderAccountActions />
            </div>
            <div className="hidden md:block">
              <SellProductButton />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-12 rounded-xl border bg-white text-slate-900 shadow-sm dark:bg-card dark:text-card-foreground"
              aria-label="Səbət"
            >
              <Link href="/cart">
                <ShoppingCart className="size-6" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        {showMobileSearch && (stores.length > 0 || categories.length > 0) ? (
          <div className="border-t bg-white/95 px-4 py-3 dark:bg-background/95 md:hidden">
            <MarketplaceSearch
              stores={stores}
              categories={categories}
              defaultValue={searchDefaultValue}
              stackOnMobile
              className="w-full"
              inputClassName="h-14 rounded-2xl border-0 bg-slate-100 pl-12 pr-4 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--marketplace-primary)/0.3)] dark:bg-muted"
            />
          </div>
        ) : null}
      </header>
      {showBottomNav ? <MobileBottomNav /> : null}
    </>
  );
}

export { MarketplaceHeader as PublicHeader };
