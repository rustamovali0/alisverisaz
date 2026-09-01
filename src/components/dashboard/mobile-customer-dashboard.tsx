"use client";

import type { ReactNode } from "react";
import {
  Home,
  MapPin,
  MessageCircle,
  Package,
  Settings,
  UserRound,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo } from "react";

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
  { href: "/dashboard/settings", label: "Ayarlar", icon: Settings },
] as const;

const customerOnlyItems = [
  { href: "/dashboard/messages", label: "Mesajlar", icon: MessageCircle },
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
  const router = useRouter();
  const visibleItems = useMemo(
    () => [
      ...accountItems,
      ...(role === "customer" ? customerOnlyItems : []),
    ],
    [role],
  );

  useEffect(() => {
    visibleItems.forEach((item) => router.prefetch(item.href));
  }, [router, visibleItems]);

  return (
    <section className="min-w-0 max-w-full overflow-x-clip bg-background px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 text-foreground md:hidden">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-sm">
        <Link
          href="/dashboard/profile"
          onClick={resetDashboardScroll}
          className="flex min-w-0 items-center gap-3"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <UserRound className="size-6" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black">Hesabım</span>
            <span className="mt-0.5 block truncate text-sm text-muted-foreground">{userLabel || userContact}</span>
          </span>
        </Link>
      </div>

      <div id="mobile-account-sections" className="grid grid-cols-2 gap-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveAccountItem(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => {
                resetDashboardScroll();
              }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "grid min-h-[72px] min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-2 rounded-xl border bg-card p-3 shadow-sm transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              <Icon className="size-6" strokeWidth={2.1} aria-hidden="true" />
              <span className="min-w-0 truncate text-sm font-black">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-3">
        <LogoutButton className="w-full justify-center rounded-xl text-sm" />
      </div>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}
