"use client";

import type { ReactNode } from "react";
import {
  ChevronRight,
  Bell,
  Home,
  MapPin,
  Package,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type MobileCustomerDashboardProps = {
  userLabel: string;
  userContact: string;
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
];

function isDashboardRoot(pathname: string) {
  return pathname === "/dashboard" || pathname.endsWith("/dashboard");
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
  children,
}: MobileCustomerDashboardProps) {
  const pathname = usePathname();
  const showMenu = isDashboardRoot(pathname);

  if (!showMenu) {
    return (
      <section className="bg-background px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 text-foreground md:hidden">
        {children}
      </section>
    );
  }

  return (
    <section className="bg-background px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 text-foreground md:hidden">
      <Link
        href="/dashboard/profile"
        onClick={resetDashboardScroll}
        className="mb-4 grid min-w-0 grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm"
      >
        <span className="relative grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="size-7" strokeWidth={2.1} aria-hidden="true" />
          <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-black">{userLabel}</span>
          {userContact ? <span className="mt-0.5 block truncate text-sm text-muted-foreground">{userContact}</span> : null}
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
      </Link>

      <div className="space-y-0.5">
        {accountItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={resetDashboardScroll}
              className="grid min-h-[54px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b text-foreground"
            >
              <Icon className="size-6" strokeWidth={2.1} aria-hidden="true" />
              <span className="min-w-0 truncate text-base font-semibold">{item.label}</span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
            </Link>
          );
        })}
      </div>

      <div className="mt-5 border-t-8 border-muted pt-4">
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
      <div className="mt-5">{children}</div>
    </section>
  );
}
