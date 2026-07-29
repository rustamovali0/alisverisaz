"use client";

import {
  Heart,
  LogIn,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";
import { useMemo } from "react";

import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { SellProductButton } from "@/components/auth/sell-product-button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { useClientAuthProfile } from "@/lib/auth/use-client-auth-profile";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { CategoryOption } from "@/lib/products/types";

type MarketplaceHeaderProps = {
  siteName?: string;
  stores?: MarketplaceStore[];
  categories?: CategoryOption[];
  searchDefaultValue?: string;
  showMobileSearch?: boolean;
  showBottomNav?: boolean;
};

function formatBrandName(value?: string) {
  if (!value || value.toLocaleLowerCase("az-AZ").includes("alisveris")) {
    return "Alışveriş";
  }

  return value;
}

function getAccountHref(role: AuthRole | null) {
  if (role === "admin") {
    return "/radmin";
  }

  if (role === "seller") {
    return "/store/dashboard";
  }

  return role ? "/dashboard" : "/login";
}

function getAccountIcon(role: AuthRole | null) {
  if (role === "admin") {
    return ShieldCheck;
  }

  if (role === "seller") {
    return Store;
  }

  return UserRound;
}

function getNextHref(pathname: string) {
  if (pathname === "/login" || pathname === "/register") {
    return "/";
  }

  return pathname || "/";
}

export function MarketplaceHeader({
  siteName = "Alışveriş",
  stores = [],
  categories = [],
  searchDefaultValue,
  showMobileSearch = false,
  showBottomNav = true,
}: MarketplaceHeaderProps) {
  const displaySiteName = formatBrandName(siteName);
  const pathname = usePathname();
  const profile = useClientAuthProfile();
  const accountHref = getAccountHref(profile.status === "authenticated" ? profile.role : null);
  const AccountIcon = getAccountIcon(profile.status === "authenticated" ? profile.role : null);
  const mobileAccount = useMemo(() => {
    if (profile.status === "loading") {
      return (
        <div
          className="size-11 animate-pulse rounded-md border bg-muted/70"
          aria-hidden="true"
        />
      );
    }

    if (profile.status === "guest") {
      return (
        <Button asChild variant="outline" size="sm" className="h-10 px-3">
          <Link href={`/login?next=${encodeURIComponent(getNextHref(pathname))}`}>
            <LogIn className="mr-2 size-4" aria-hidden="true" />
            Daxil ol
          </Link>
        </Button>
      );
    }

    return (
      <Button asChild variant="outline" size="icon" className="size-11">
        <Link href={accountHref} aria-label="Hesabım">
          <AccountIcon className="size-6" aria-hidden="true" />
        </Link>
      </Button>
    );
  }, [AccountIcon, accountHref, pathname, profile]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 shadow-sm shadow-slate-950/[0.03] backdrop-blur">
        <div className="container flex w-full max-w-full min-w-0 flex-wrap items-center gap-3 py-3 xl:flex-nowrap">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-lg font-black text-primary-foreground shadow-sm">
              a
            </span>
            <span className="min-w-0 truncate text-lg font-black tracking-normal sm:text-xl">
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
              className="size-11 rounded-md border bg-background"
              aria-label="Səbət"
            >
              <Link href="/cart">
                <ShoppingCart className="size-6" aria-hidden="true" />
              </Link>
            </Button>
            {mobileAccount}
          </div>
        </div>
        {showMobileSearch && (stores.length > 0 || categories.length > 0) ? (
          <div className="border-t bg-background/95 px-4 py-3 md:hidden">
            <MarketplaceSearch
              stores={stores}
              categories={categories}
              defaultValue={searchDefaultValue}
              stackOnMobile
              className="w-full"
            />
          </div>
        ) : null}
      </header>
      {showBottomNav ? <MobileBottomNav /> : null}
    </>
  );
}

export { MarketplaceHeader as PublicHeader };
