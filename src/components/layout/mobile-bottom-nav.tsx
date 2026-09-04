"use client";

import {
  Heart,
  Home,
  LayoutDashboard,
  Package,
  Plus,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import type { MobileNavbarVariant } from "@/lib/cms/types";
import { getStorePath } from "@/lib/config/domains";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  className?: string;
  variant?: MobileNavbarVariant;
  storeSubdomainSlug?: string | null;
  storeHomeHref?: string;
  initialRole?: AuthRole | null;
};

const CART_KEY = "alisveris_cart";

const navVariantClass: Record<MobileNavbarVariant, string> = {
  classic:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
  floating:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
  pill:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
  compact:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
  outlined:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
  soft:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
  solid:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none dark:border-slate-800 dark:bg-slate-950",
  glass:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
  minimal:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
  rail:
    "inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-none backdrop-blur-[14px] dark:border-slate-800 dark:bg-slate-950/90",
};

const itemVariantClass: Record<MobileNavbarVariant, string> = {
  classic: "rounded-lg",
  floating: "rounded-lg",
  pill: "rounded-lg",
  compact: "rounded-lg",
  outlined: "rounded-lg",
  soft: "rounded-lg",
  solid: "rounded-lg",
  glass: "rounded-lg",
  minimal: "rounded-lg",
  rail: "rounded-lg",
};

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

function accountPath(role: AuthRole | null) {
  if (role === "seller") {
    return "/store/dashboard";
  }

  return role === "customer" ? "/dashboard" : "/login?next=/dashboard";
}

function scrollPageToTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

function AccountIcon({ role }: { role: AuthRole | null }) {
  if (role === "seller") {
    return (
      <LayoutDashboard
        className="mx-auto size-6 min-h-6 min-w-6 stroke-[2.4]"
        aria-hidden="true"
      />
    );
  }

  return <UserRound className="mx-auto size-6 min-h-6 min-w-6 stroke-[2.4]" aria-hidden="true" />;
}

export function MobileBottomNav({
  className,
  variant = "classic",
  storeSubdomainSlug,
  storeHomeHref = "/",
  initialRole,
}: MobileBottomNavProps) {
  const common = useTranslations("common");
  const nav = useTranslations("nav");
  const auth = useTranslations("auth");
  const { profile, isResolved } = useClientAuthProfileState();
  const pathname = usePathname();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [sellerStoreHref, setSellerStoreHref] = useState<string | null>(null);
  const isAuthLoading = !isResolved && !initialRole;
  const actualRole =
    !isResolved && initialRole
      ? initialRole
      : profile.status === "authenticated"
        ? profile.role
        : null;
  const routeRole: AuthRole | null =
    pathname.startsWith("/store/dashboard") || pathname.startsWith("/seller")
      ? "seller"
      : pathname.startsWith("/dashboard")
        ? "customer"
        : null;
  const role = actualRole === "admin" ? null : actualRole ?? routeRole;
  const accountHref = isAuthLoading ? null : accountPath(role);
  const accountText = isAuthLoading
    ? nav("account")
    : role === "seller"
        ? "Panel"
        : role
          ? nav("account")
          : auth("login");
  const isAuthenticated = Boolean(role);
  const isStorefrontHome = Boolean(
    storeSubdomainSlug
      ? pathname === "/"
      : storeHomeHref !== "/" &&
          !storeHomeHref.startsWith("/store/") &&
          pathname === storeHomeHref,
  );
  const storefrontItem = {
    href: isStorefrontHome ? storeHomeHref : "/",
    label: isStorefrontHome ? nav("storefront") : nav("home"),
    icon: isStorefrontHome ? Store : Home,
  };

  useEffect(() => {
    if (
      profile.status !== "authenticated" ||
      profile.role !== "seller" ||
      role !== "seller"
    ) {
      setSellerStoreHref(null);
      return;
    }

    let active = true;
    const supabase = createSupabaseBrowserClient();
    const ownerId = profile.userId;

    async function loadStorefrontHref() {
      const { data } = await (supabase as any)
        .from("stores")
        .select("slug")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const store = data as { slug?: string | null } | null;

      if (active && store?.slug) {
        setSellerStoreHref(getStorePath(store.slug));
      }
    }

    void loadStorefrontHref();

    return () => {
      active = false;
    };
  }, [profile.status, profile.role, profile.userId, role]);

  const items =
    role === "seller"
      ? [
          {
            href: "/",
            label: nav("home"),
            icon: Home,
          },
          {
            href: sellerStoreHref ?? "/store/dashboard/products",
            label: "Mağazam",
            icon: Store,
          },
          {
            href: "/sell",
            label: nav("addProduct"),
            icon: Plus,
          },
          { href: "/seller/orders", label: "Sifarişlər", icon: Package },
        ]
      : [
          storefrontItem,
          { href: "/products", label: nav("products"), icon: Package },
          ...(isAuthenticated
            ? [{ href: "/favorites", label: nav("favorites"), icon: Heart }]
            : []),
          { href: "/cart", label: common("cart"), icon: ShoppingCart, badge: cartCount },
        ];
  const totalNavItems = items.length + 1;
  const navGridClass = totalNavItems >= 5 ? "grid-cols-5" : "grid-cols-4";

  const isCurrentRoute = useCallback(
    (href: string) => {
      const cleanHref = href.split(/[?#]/)[0] || "/";

      return cleanHref === "/"
        ? pathname === "/"
        : pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
    },
    [pathname],
  );

  const navigate = useCallback(
    (href: string) => {
      if (isCurrentRoute(href)) {
        return;
      }

      router.push(href, { scroll: true });
      scrollPageToTop();
    },
    [isCurrentRoute, router],
  );

  const handleItemNavigation = useCallback(
    (href: string) => {
      if (href === "/favorites" && !role) {
        showToast({
          title: "Giriş tələb olunur",
          description: "Sevimlilərə əlavə etmək üçün login olmaq lazımdır.",
          variant: "info",
        });
        return;
      }

      navigate(href);
    },
    [navigate, role],
  );

  const isNavItemActive = useCallback(
    (href: string) => {
      if (href === "/") {
        return pathname === "/";
      }

      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  const isAccountRoute =
    (role === "seller" && pathname === "/store/dashboard") ||
    (role !== "seller" && pathname.startsWith("/dashboard"));
  const currentItemHref = items.find((item) => isNavItemActive(item.href))?.href ?? null;
  const activeHref = currentItemHref ?? (isAccountRoute ? accountHref : null);

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

  if (isAuthLoading) {
    return (
      <nav
        className={cn(
          "mobile-performance-surface fixed z-50 max-w-full overflow-x-clip md:hidden",
          navVariantClass[variant],
          className,
        )}
        aria-label={nav("mobileNavigation")}
        aria-busy="true"
      >
        <div className={cn("grid w-full gap-1", navGridClass)}>
          {Array.from({ length: totalNavItems }, (_, index) => (
            <span
              key={index}
              className="mx-auto h-11 w-full max-w-12 animate-pulse rounded-xl bg-muted/70"
              aria-hidden="true"
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "mobile-performance-surface fixed z-50 max-w-full overflow-x-clip md:hidden",
        navVariantClass[variant],
        className,
      )}
      aria-label={nav("mobileNavigation")}
    >
      <div className={cn("grid w-full min-w-0 items-center text-center text-foreground", navGridClass)}>
        {items.map((item) => {
          const Icon = item.icon;
          const badge = "badge" in item && typeof item.badge === "number" ? item.badge : 0;
          const isActive = activeHref === item.href;

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => handleItemNavigation(item.href)}
              className={cn(
                "relative grid min-h-[58px] min-w-0 touch-manipulation select-none place-items-center gap-0.5 px-1 text-[11px] font-semibold text-slate-500 transition-[transform,color] duration-150 active:scale-95 min-[390px]:text-xs [-webkit-tap-highlight-color:transparent] dark:text-slate-400",
                itemVariantClass[variant],
                isActive && "text-blue-600 dark:text-blue-300",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
            >
              <span
                className={cn(
                  "relative grid size-8 place-items-center rounded-lg transition-colors",
                  isActive && "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
                )}
              >
                <Icon
                  className="mx-auto size-6 min-h-6 min-w-6"
                  strokeWidth={isActive ? 2.7 : 2.35}
                  aria-hidden="true"
                />
                {badge > 0 ? (
                  <span className="absolute -right-1 -top-1 z-10 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-black leading-none text-primary-foreground ring-2 ring-background">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            if (accountHref) {
              navigate(accountHref);
            }
          }}
          disabled={isAuthLoading}
          className={cn(
            "grid min-h-[58px] min-w-0 touch-manipulation select-none place-items-center gap-0.5 px-1 text-[11px] font-semibold text-slate-500 transition-[transform,color] duration-150 active:scale-95 min-[390px]:text-xs [-webkit-tap-highlight-color:transparent] dark:text-slate-400",
            itemVariantClass[variant],
            isAuthLoading && "cursor-wait opacity-70",
            activeHref === accountHref && "text-blue-600 dark:text-blue-300",
          )}
          aria-current={activeHref === accountHref ? "page" : undefined}
          aria-disabled={isAuthLoading}
          aria-label={accountText}
        >
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg transition-colors",
              activeHref === accountHref && "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
            )}
          >
            <AccountIcon role={role} />
          </span>
          <span className="max-w-full truncate leading-none">{accountText}</span>
        </button>
      </div>
    </nav>
  );
}
