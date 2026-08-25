"use client";

import {
  Heart,
  Home,
  Package,
  Plus,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { useClientAuthProfile } from "@/lib/auth/use-client-auth-profile";
import type { MobileNavbarVariant } from "@/lib/cms/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  className?: string;
  variant?: MobileNavbarVariant;
};

const CART_KEY = "alisveris_cart";

const navVariantClass: Record<MobileNavbarVariant, string> = {
  classic:
    "inset-x-0 bottom-0 border-t border-border/80 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 shadow-[0_-8px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl",
  floating:
    "inset-x-3 bottom-3 rounded-2xl border border-border/80 bg-background/95 px-2 py-2 shadow-[0_14px_36px_rgba(15,23,42,0.2)] backdrop-blur-xl",
  pill:
    "inset-x-4 bottom-3 rounded-full border border-border/80 bg-background/95 px-2 py-2 shadow-[0_12px_34px_rgba(15,23,42,0.18)] backdrop-blur-xl",
  compact:
    "inset-x-0 bottom-0 border-t border-border/80 bg-background/95 px-1 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1 shadow-[0_-6px_20px_rgba(15,23,42,0.1)] backdrop-blur-lg",
  outlined:
    "inset-x-2 bottom-2 rounded-xl border-2 border-primary/25 bg-background/95 px-2 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.14)] backdrop-blur-xl",
  soft:
    "inset-x-0 bottom-0 border-t border-primary/15 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 shadow-[0_-8px_28px_rgba(15,23,42,0.1)] backdrop-blur-lg",
  solid:
    "inset-x-0 bottom-0 border-t border-primary/20 bg-background px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 shadow-[0_-8px_28px_rgba(15,23,42,0.1)]",
  glass:
    "inset-x-3 bottom-3 rounded-2xl border border-border/70 bg-background/92 px-2 py-2 shadow-[0_14px_38px_rgba(15,23,42,0.2)] backdrop-blur-2xl",
  minimal:
    "inset-x-0 bottom-0 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-lg",
  rail:
    "inset-x-2 bottom-2 rounded-lg border border-border/80 bg-background/95 px-1.5 py-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur-xl",
};

const itemVariantClass: Record<MobileNavbarVariant, string> = {
  classic: "rounded-xl",
  floating: "rounded-xl",
  pill: "rounded-full",
  compact: "rounded-lg min-h-[48px]",
  outlined: "rounded-lg",
  soft: "rounded-xl",
  solid: "rounded-xl",
  glass: "rounded-xl",
  minimal: "rounded-lg",
  rail: "rounded-md min-h-[48px]",
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
    return <Store className="mx-auto size-7 min-h-7 min-w-7 stroke-[2.4]" aria-hidden="true" />;
  }

  return <UserRound className="mx-auto size-7 min-h-7 min-w-7 stroke-[2.4]" aria-hidden="true" />;
}

export function MobileBottomNav({ className, variant = "classic" }: MobileBottomNavProps) {
  const common = useTranslations("common");
  const nav = useTranslations("nav");
  const auth = useTranslations("auth");
  const profile = useClientAuthProfile();
  const pathname = usePathname();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [sellerStoreHref, setSellerStoreHref] = useState<string | null>(null);
  const lastNavigationRef = useRef<{ href: string; at: number } | null>(null);
  const isAuthLoading = profile.status === "loading";
  const actualRole = profile.status === "authenticated" ? profile.role : null;
  const role = actualRole === "admin" ? null : actualRole;
  const accountHref = isAuthLoading ? null : accountPath(role);
  const accountText = isAuthLoading
    ? nav("account")
    : role === "seller"
        ? "İdarə paneli"
        : role
          ? nav("account")
          : auth("login");

  useEffect(() => {
    if (role !== "seller") {
      setSellerStoreHref(null);
      return;
    }

    let active = true;
    const supabase = createSupabaseBrowserClient();

    async function loadStorefrontHref() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data } = await (supabase as any)
        .from("stores")
        .select("slug")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const store = data as { slug?: string | null } | null;

      if (active && store?.slug) {
        setSellerStoreHref(`/${store.slug}`);
      }
    }

    void loadStorefrontHref();

    return () => {
      active = false;
    };
  }, [role]);

  const items =
    role === "seller"
      ? [
          { href: "/", label: nav("home"), icon: Home },
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
          { href: "/store/dashboard/orders", label: "Sifarişlər", icon: Package },
        ]
      : [
          { href: "/", label: nav("home"), icon: Home },
          { href: "/products", label: nav("products"), icon: Package },
          { href: "/favorites", label: nav("favorites"), icon: Heart },
          { href: "/cart", label: common("cart"), icon: ShoppingCart, badge: cartCount },
        ];

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

      const now = Date.now();
      const lastNavigation = lastNavigationRef.current;

      if (lastNavigation?.href === href && now - lastNavigation.at < 600) {
        return;
      }

      lastNavigationRef.current = { href, at: now };
      setPendingHref(href);
      router.push(href, { scroll: true });
      scrollPageToTop();
    },
    [isCurrentRoute, router],
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

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

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
        <div className="grid w-full grid-cols-5 gap-1">
          {Array.from({ length: 5 }, (_, index) => (
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
      <div className="grid w-full min-w-0 grid-cols-5 items-center text-center text-foreground">
        {items.map((item) => {
          const Icon = item.icon;
          const badge = "badge" in item && typeof item.badge === "number" ? item.badge : 0;
          const isActive = (pendingHref ?? (isNavItemActive(item.href) ? item.href : null)) === item.href;

          return (
            <button
              key={item.href}
              type="button"
              onPointerUp={(event) => {
                if (event.pointerType === "touch") {
                  event.preventDefault();
                  navigate(item.href);
                }
              }}
              onClick={() => navigate(item.href)}
              className={cn(
                "relative grid min-h-[54px] min-w-0 touch-manipulation select-none place-items-center gap-0.5 px-1 text-[11px] font-semibold text-foreground/70 transition-[background-color,color,transform] duration-150 hover:bg-primary/10 hover:text-primary active:scale-95 active:bg-primary/15 min-[390px]:text-xs [-webkit-tap-highlight-color:transparent]",
                itemVariantClass[variant],
                isActive && "bg-primary/10 text-primary",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
            >
              <span className="relative grid place-items-center">
                <Icon
                  className="mx-auto size-7 min-h-7 min-w-7"
                  strokeWidth={isActive ? 2.7 : 2.35}
                  aria-hidden="true"
                />
                {badge > 0 ? (
                  <span className="absolute -right-2 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground">
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
          onPointerUp={(event) => {
            if (event.pointerType === "touch") {
              event.preventDefault();
              if (accountHref) {
                navigate(accountHref);
              }
            }
          }}
          onClick={() => {
            if (accountHref) {
              navigate(accountHref);
            }
          }}
          disabled={isAuthLoading}
          className={cn(
            "grid min-h-[54px] min-w-0 touch-manipulation select-none place-items-center gap-0.5 px-1 text-[11px] font-semibold text-foreground/70 transition-[background-color,color,transform] duration-150 hover:bg-primary/10 hover:text-primary active:scale-95 active:bg-primary/15 min-[390px]:text-xs [-webkit-tap-highlight-color:transparent]",
            itemVariantClass[variant],
            isAuthLoading && "cursor-wait opacity-70",
            ((role === "seller" && pathname.startsWith("/store/dashboard")) ||
              (role !== "seller" && pathname.startsWith("/dashboard"))) &&
              "bg-primary/10 text-primary",
          )}
          aria-current={
            (role === "seller" && pathname.startsWith("/store/dashboard")) ||
            (role !== "seller" && pathname.startsWith("/dashboard"))
              ? "page"
              : undefined
          }
          aria-disabled={isAuthLoading}
          aria-label={accountText}
        >
          <AccountIcon role={role} />
          <span className="max-w-full truncate leading-none">{accountText}</span>
        </button>
      </div>
    </nav>
  );
}
