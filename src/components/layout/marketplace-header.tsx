import { Heart, Search, ShoppingCart } from "lucide-react";

import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { SellProductButton } from "@/components/auth/sell-product-button";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type MarketplaceHeaderProps = {
  siteName?: string;
};

function formatBrandName(value?: string) {
  if (!value || value.toLocaleLowerCase("az-AZ").includes("alisveris")) {
    return "Alışveriş";
  }

  return value;
}

export function MarketplaceHeader({ siteName = "Alışveriş" }: MarketplaceHeaderProps) {
  const desktopSearchFormId = "marketplace-header-search-desktop";
  const displaySiteName = formatBrandName(siteName);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 shadow-sm shadow-slate-950/[0.03] backdrop-blur">
        <div className="container flex min-h-16 flex-wrap items-center gap-3 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-lg font-black text-primary-foreground shadow-sm">
              a
            </span>
            <span className="text-lg font-black tracking-normal sm:text-xl">
              {displaySiteName}
            </span>
          </Link>
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link href="/products">Məhsullar</Link>
          </Button>
          <form
            id={desktopSearchFormId}
            action="/products"
            className="hidden min-w-56 flex-1 md:block"
          >
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                name="q"
                className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Mağaza, məhsul və kateqoriya axtar"
              />
            </label>
          </form>
          <Button type="submit" form={desktopSearchFormId} className="hidden md:inline-flex">
            Axtar
          </Button>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="ml-auto hidden size-11 sm:inline-flex md:ml-0"
          >
            <Link href="/dashboard/favorites" aria-label="Sevimlilər">
              <Heart className="size-6" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="size-11">
            <Link href="/cart" aria-label="Səbət">
              <ShoppingCart className="size-6" aria-hidden="true" />
            </Link>
          </Button>
          <HeaderAccountActions className="hidden lg:flex" />
          <div className="hidden md:block">
            <SellProductButton />
          </div>
          <form action="/products" className="basis-full md:hidden">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                name="q"
                className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Axtar: məhsul, mağaza, kateqoriya"
              />
            </label>
          </form>
        </div>
      </header>
      <MobileBottomNav />
    </>
  );
}
