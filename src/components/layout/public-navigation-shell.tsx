"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { MarketplaceHeader } from "@/components/layout/marketplace-header";
import { usePathname } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { AuthRole } from "@/lib/auth/types";
import type { MobileNavbarVariant } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";

type PublicNavigationShellProps = {
  children: ReactNode;
  siteName?: string;
  logoUrl?: string;
  darkLogoUrl?: string;
  stores: MarketplaceStore[];
  categories: CategoryOption[];
  mobileNavbarVariant?: MobileNavbarVariant;
  storeSubdomainSlug?: string | null;
  initialRole?: AuthRole | null;
};

const hiddenPrefixes = [
  "/admin",
  "/radmin",
];

const hiddenPaths = new Set([
  "/logout",
]);

const reservedPublicSegments = new Set([
  "",
  "about",
  "admin",
  "cart",
  "categories",
  "checkout",
  "dashboard",
  "favorites",
  "login",
  "logout",
  "products",
  "register",
  "radmin",
  "seller",
  "store",
  "stores",
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
  logoUrl,
  darkLogoUrl,
  stores,
  categories,
  mobileNavbarVariant,
  storeSubdomainSlug,
  initialRole,
}: PublicNavigationShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showNavigation = shouldShowPublicNavigation(pathname);
  const firstPathSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  const matchedStoreSlug = stores.find(
    (store) =>
      pathname === `/${store.slug}` ||
      pathname.startsWith(`/${store.slug}/`) ||
      pathname === `/store/${store.slug}` ||
      pathname.startsWith(`/store/${store.slug}/`),
  )?.slug;
  const pathStoreSlug = matchedStoreSlug ?? (
    firstPathSegment && !reservedPublicSegments.has(firstPathSegment)
      ? firstPathSegment
      : undefined
  );
  const searchStoreSlug = storeSubdomainSlug ?? pathStoreSlug;
  const isLegacyStorePath = Boolean(
    pathStoreSlug &&
      (pathname === `/store/${pathStoreSlug}` ||
        pathname.startsWith(`/store/${pathStoreSlug}/`)),
  );
  const isStandaloneStoreHome = Boolean(
    pathStoreSlug && !isLegacyStorePath && pathname === `/${pathStoreSlug}`,
  );
  const storeHomeHref = storeSubdomainSlug
    ? "/"
    : pathStoreSlug
      ? isLegacyStorePath
        ? `/store/${pathStoreSlug}`
        : `/${pathStoreSlug}`
      : "/";
  const productsHref = pathStoreSlug ? `${storeHomeHref}#products` : "/products";
  const brandHomeHref = isLegacyStorePath ? "/" : storeHomeHref;

  return (
    <>
      {showNavigation && !isStandaloneStoreHome ? (
        <MarketplaceHeader
          siteName={siteName}
          logoUrl={logoUrl}
          darkLogoUrl={darkLogoUrl}
          stores={stores}
          categories={categories}
          searchDefaultValue={searchParams.get("q") ?? undefined}
          showMobileSearch
          compactMobileSearch={isProductDetailPath(pathname)}
          mobileNavbarVariant={mobileNavbarVariant}
          storeSubdomainSlug={storeSubdomainSlug}
          storeHomeHref={storeHomeHref}
          brandHomeHref={brandHomeHref}
          productsHref={productsHref}
          searchStoreSlug={searchStoreSlug}
          initialRole={initialRole}
          sticky={!isProductDetailPath(pathname)}
        />
      ) : null}
      {children}
    </>
  );
}
