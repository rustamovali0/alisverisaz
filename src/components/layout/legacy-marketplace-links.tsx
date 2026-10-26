"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
const paths: Record<string, string> = {
  catalog: "/products",
  favorites: "/favorites",
  stores: "/stores",
  store: "/stores",
  checkout: "/checkout",
  success: "/dashboard/orders",
  account: "/dashboard",
};
/** Keep saved links from the approved prototype pointing to real application routes. */
export function LegacyMarketplaceLinks() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, isResolved } = useClientAuthProfileState();
  useEffect(() => {
    if (pathname !== "/") return;
    const handle = () => {
      const hash = location.hash.slice(1);
      let target = paths[hash];
      if (hash === "dashboard") {
        if (!isResolved) return;
        target =
          profile.status === "authenticated" && profile.role === "seller"
            ? "/store/dashboard"
            : profile.status === "authenticated" && profile.role === "admin"
              ? "/radmin"
              : "/dashboard";
      }
      if (!target) return;
      const params = new URLSearchParams(location.search);
      if (params.get("sort") === "price-asc") params.set("sort", "price_asc");
      if (params.get("sort") === "price-desc") params.set("sort", "price_desc");
      if (params.has("min")) {
        params.set("minPrice", params.get("min")!);
        params.delete("min");
      }
      if (params.has("max")) {
        params.set("maxPrice", params.get("max")!);
        params.delete("max");
      }
      router.replace(
        target + (target === "/products" && params.size ? `?${params}` : ""),
      );
    };
    handle();
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, [pathname, router, profile, isResolved]);
  return null;
}
