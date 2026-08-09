"use client";

import {
  Grid2X2,
  Heart,
  Home,
  ShoppingCart,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { useClientAuthProfile } from "@/lib/auth/use-client-auth-profile";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  className?: string;
};

const CART_KEY = "alisveris_cart";

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
  if (role === "admin") {
    return "/radmin";
  }

  if (role === "seller") {
    return "/store/dashboard";
  }

  return role ? "/dashboard" : "/login?next=/dashboard";
}

function accountLabel(role: AuthRole | null) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "seller") {
    return "Panel";
  }

  return role ? "Hesabım" : "Giriş";
}

function AccountIcon({ role }: { role: AuthRole | null }) {
  if (role === "admin") {
    return <ShieldCheck className="mx-auto size-7 min-h-7 min-w-7 stroke-[2.4]" aria-hidden="true" />;
  }

  if (role === "seller") {
    return <Store className="mx-auto size-7 min-h-7 min-w-7 stroke-[2.4]" aria-hidden="true" />;
  }

  return <UserRound className="mx-auto size-7 min-h-7 min-w-7 stroke-[2.4]" aria-hidden="true" />;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const profile = useClientAuthProfile();
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const role = profile.status === "authenticated" ? profile.role : null;
  const items = [
    { href: "/", label: "Əsas", icon: Home },
    { href: "/products", label: "Kataloq", icon: Grid2X2 },
    { href: "/favorites", label: "Seçilmişlər", icon: Heart },
    { href: "/cart", label: "Səbət", icon: ShoppingCart, badge: cartCount },
  ];

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

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 w-full max-w-full overflow-x-clip border-t border-slate-200 bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] dark:border-border dark:bg-background md:hidden",
        className,
      )}
      aria-label="Mobil naviqasiya"
    >
      <div className="grid w-full min-w-0 grid-cols-5 items-center text-center">
        {items.map((item) => {
          const Icon = item.icon;
          const badge = "badge" in item && typeof item.badge === "number" ? item.badge : 0;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative grid min-h-[52px] min-w-0 place-items-center gap-0.5 px-1 text-[11px] font-semibold text-[hsl(var(--marketplace-muted))] transition hover:text-[hsl(var(--marketplace-primary))] min-[390px]:text-xs",
                isActive && "text-[hsl(var(--marketplace-primary))]",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative grid place-items-center">
                <Icon
                  className="mx-auto size-7 min-h-7 min-w-7"
                  strokeWidth={isActive ? 2.7 : 2.35}
                  aria-hidden="true"
                />
                {badge > 0 ? (
                  <span className="absolute -right-2 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[hsl(var(--marketplace-primary))] px-1 text-[11px] font-bold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href={accountPath(role)}
          className={cn(
            "grid min-h-[52px] min-w-0 place-items-center gap-0.5 px-1 text-[11px] font-semibold text-[hsl(var(--marketplace-muted))] transition hover:text-[hsl(var(--marketplace-primary))] min-[390px]:text-xs",
            (pathname.startsWith("/dashboard") ||
              pathname.startsWith("/admin") ||
              pathname.startsWith("/store/dashboard") ||
              pathname.startsWith("/radmin")) &&
              "text-[hsl(var(--marketplace-primary))]",
          )}
          aria-current={
            pathname.startsWith("/dashboard") ||
            pathname.startsWith("/admin") ||
            pathname.startsWith("/store/dashboard") ||
            pathname.startsWith("/radmin")
              ? "page"
              : undefined
          }
        >
          <AccountIcon role={role} />
          <span className="max-w-full truncate leading-none">{role ? accountLabel(role) : "Kabinet"}</span>
        </Link>
      </div>
    </nav>
  );
}
