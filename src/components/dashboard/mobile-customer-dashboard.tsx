"use client";

import type { ReactNode } from "react";
import {
  ChevronRight,
  Bell,
  Heart,
  Home,
  Menu,
  MapPin,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
  X,
  UserRound,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Link, usePathname } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type MobileCustomerDashboardProps = {
  userLabel: string;
  userContact: string;
  role: Extract<AuthRole, "customer" | "seller">;
  children: ReactNode;
};

const accountItems = [
  { href: "/dashboard", label: "Ana səhifə", icon: Home },
  { href: "/dashboard/orders", label: "Sifarişlər", icon: Package },
  { href: "/dashboard/profile", label: "Profil", icon: UserRound },
  { href: "/dashboard/addresses", label: "Ünvanlar", icon: MapPin },
  { href: "/dashboard/notifications", label: "Bildirişlər", icon: Bell },
  { href: "/dashboard/security", label: "Təhlükəsizlik", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Ayarlar", icon: Settings },
] as const;

const customerOnlyItems = [
  { href: "/dashboard/messages", label: "Mesajlar", icon: MessageCircle },
] as const;

const sharedBuyerItems = [
  { href: "/dashboard/favorites", label: "Favorilər", icon: Heart },
] as const;

function isDashboardRoot(pathname: string) {
  return pathname === "/dashboard" || pathname.endsWith("/dashboard");
}

function isActiveAccountItem(pathname: string, href: string) {
  return href === "/dashboard" ? isDashboardRoot(pathname) : pathname === href || pathname.startsWith(`${href}/`);
}

function resetDashboardScroll() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.querySelectorAll<HTMLElement>("[data-dashboard-scroll-root]").forEach((element) => {
    element.scrollTop = 0;
  });
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelectorAll<HTMLElement>("[data-dashboard-scroll-root]").forEach((element) => {
      element.scrollTop = 0;
    });
  });
}

export function MobileCustomerDashboard({
  userLabel,
  userContact,
  role,
  children,
}: MobileCustomerDashboardProps) {
  const pathname = usePathname();
  const showMenu = isDashboardRoot(pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const visibleItems = [
    ...accountItems,
    ...(role === "customer" ? customerOnlyItems : []),
    ...sharedBuyerItems,
  ];

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <section className="min-w-0 max-w-full overflow-x-clip bg-background px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 text-foreground md:hidden">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-sm">
        <Link
          href={showMenu ? "/dashboard/profile" : "/dashboard"}
          onClick={resetDashboardScroll}
          className="grid min-w-0 grid-cols-[54px_minmax(0,1fr)] items-center gap-3"
        >
          <span className="relative grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-7" strokeWidth={2.1} aria-hidden="true" />
            <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black">{userLabel}</span>
            {userContact ? <span className="mt-0.5 block truncate text-sm text-muted-foreground">{userContact}</span> : null}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border bg-background px-3 text-sm font-semibold text-foreground"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-account-sections"
        >
          {isMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          Bölmələr
        </button>
      </div>

      <div id="mobile-account-sections" className={cn("space-y-0.5", !isMenuOpen && "hidden")}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = (pendingHref ?? (isActiveAccountItem(pathname, item.href) ? item.href : null)) === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => {
                setPendingHref(item.href);
                setIsMenuOpen(false);
                resetDashboardScroll();
              }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "grid min-h-[54px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border-b text-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-6" strokeWidth={2.1} aria-hidden="true" />
              <span className="min-w-0 truncate text-base font-semibold">{item.label}</span>
              <ChevronRight className={cn("size-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} aria-hidden="true" />
            </Link>
          );
        })}
      </div>

      <div className={cn("mt-5 border-t-8 border-muted pt-4", !isMenuOpen && "hidden")}>
        <div
          className={cn(
            "grid min-h-[54px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 text-foreground",
          )}
        >
          <Settings className="size-6" strokeWidth={2.1} aria-hidden="true" />
          <span className="min-w-0 truncate text-base font-semibold">Görünüş</span>
          <ThemeToggle />
        </div>
        <div className="mt-4">
          <LogoutButton className="w-full justify-center rounded-2xl text-sm" />
        </div>
      </div>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}
