"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { MarketplaceHeader } from "@/components/layout/marketplace-header";
import { usePathname } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { CategoryOption } from "@/lib/products/types";

type PublicNavigationShellProps = {
  children: ReactNode;
  siteName?: string;
  stores: MarketplaceStore[];
  categories: CategoryOption[];
};

const hiddenPrefixes = [
  "/admin",
  "/radmin",
  "/store/dashboard",
];

const hiddenPaths = new Set([
  "/forgot-password",
  "/login",
  "/logout",
  "/register",
  "/reset-password",
]);

function shouldShowPublicNavigation(pathname: string) {
  if (hiddenPaths.has(pathname)) {
    return false;
  }

  return !hiddenPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isProductDetailPath(pathname: string) {
  return /\/products\/[^/]+$/.test(pathname);
}

export function PublicNavigationShell({
  children,
  siteName,
  stores,
  categories,
}: PublicNavigationShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showNavigation = shouldShowPublicNavigation(pathname);

  return (
    <>
      {showNavigation ? (
        <MarketplaceHeader
          siteName={siteName}
          stores={stores}
          categories={categories}
          searchDefaultValue={searchParams.get("q") ?? undefined}
          showMobileSearch
          sticky={!isProductDetailPath(pathname)}
        />
      ) : null}
      {children}
    </>
  );
}
