"use client";

import type { ReactNode } from "react";
import {
  ChevronRight,
  Bell,
  Heart,
  Home,
  MapPin,
  Package,
  Settings,
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
  { href: "/dashboard", label: "İcmal", icon: Home },
  { href: "/dashboard/orders", label: "Sifarişlərim", icon: Package },
  { href: "/dashboard/favorites", label: "Sevimlilər", icon: Heart },
  { href: "/dashboard/notifications", label: "Bildirişlər", icon: Bell },
  { href: "/dashboard/addresses", label: "Ünvanlar", icon: MapPin },
  { href: "/dashboard/profile", label: "Profil", icon: UserRound },
  { href: "/dashboard/settings", label: "Ayarlar", icon: Settings },
];

function isDashboardRoot(pathname: string) {
  return pathname === "/dashboard" || pathname.endsWith("/dashboard");
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
      <section className="bg-white px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-4 text-[hsl(var(--marketplace-navy))] dark:bg-background dark:text-foreground md:hidden">
        {children}
      </section>
    );
  }

  return (
    <section className="bg-white px-5 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-5 text-[hsl(var(--marketplace-navy))] dark:bg-background dark:text-foreground md:hidden">
      <Link
        href="/dashboard/profile"
        className="mb-5 grid min-w-0 grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-border dark:bg-card"
      >
        <span className="relative grid size-14 place-items-center rounded-full bg-slate-100 text-slate-500">
          <UserRound className="size-8" strokeWidth={2.1} aria-hidden="true" />
          <span className="absolute bottom-0 right-0 size-4 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-lg font-black">{userLabel}</span>
          {userContact ? (
            <span className="mt-0.5 block truncate text-sm text-[hsl(var(--marketplace-muted))]">{userContact}</span>
          ) : null}
        </span>
        <ChevronRight className="size-6 text-[hsl(var(--marketplace-muted))]" aria-hidden="true" />
      </Link>

      <div className="space-y-0.5">
        {accountItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 text-[hsl(var(--marketplace-navy))] dark:border-border dark:text-foreground"
            >
              <Icon className="size-7" strokeWidth={2.1} aria-hidden="true" />
              <span className="min-w-0 truncate text-base font-semibold">{item.label}</span>
              <ChevronRight className="size-6 text-[hsl(var(--marketplace-muted))]" aria-hidden="true" />
            </Link>
          );
        })}
      </div>

      <div className="mt-5 border-t-8 border-slate-100 pt-4 dark:border-muted">
        <div
          className={cn(
            "grid min-h-[58px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 text-[hsl(var(--marketplace-navy))] dark:text-foreground",
          )}
        >
          <Settings className="size-7" strokeWidth={2.1} aria-hidden="true" />
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
