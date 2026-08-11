"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { m } from "framer-motion";

import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardIconView } from "@/components/dashboard/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

type AppDashboardShellProps = {
  title: string;
  description: string;
  userLabel: string;
  navItems: DashboardNavItem[];
  returnHref?: string;
  returnLabel?: string;
  children: ReactNode;
};

export function AppDashboardShell({
  title,
  description,
  userLabel,
  navItems,
  returnHref,
  returnLabel = "Sayta qayıt",
  children,
}: AppDashboardShellProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [isOpen, setIsOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/admin" || href === "/radmin" || href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebar = (
    <aside className="glass-panel flex h-full w-72 max-w-[calc(100vw-4rem)] flex-col border-r">
      <div className="border-b px-5 py-5">
        <Link href="/" className="block text-lg font-semibold tracking-normal text-foreground">
          Alışveriş
        </Link>
        <p className="mt-1 truncate text-sm text-muted-foreground">{userLabel}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200",
              isActive(item.href)
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:translate-x-0.5 hover:bg-primary/10 hover:text-foreground",
            )}
          >
            <DashboardIconView name={item.icon} className="size-4 shrink-0" />
            <span>{item.titleKey ? t(item.titleKey as any) : item.title}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t p-3">
        <LogoutButton />
      </div>
    </aside>
  );

  const mobileRail = (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r bg-background/95 shadow-lg shadow-slate-950/5 backdrop-blur-xl lg:hidden">
      <div className="grid h-16 place-items-center border-b">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setIsOpen(true)}
          aria-label="Menyunu böyüt"
          aria-expanded={isOpen}
        >
          a
        </button>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.titleKey ? t(item.titleKey as any) : item.title}
              aria-label={item.titleKey ? t(item.titleKey as any) : item.title}
              className={cn(
                "grid size-11 place-items-center rounded-xl border text-muted-foreground transition-all duration-200",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "border-transparent bg-background/70 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/10 hover:text-foreground",
              )}
            >
              <DashboardIconView name={item.icon} className="size-5 shrink-0" />
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <LogoutButton compact />
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background soft-grid-bg">
      <div className="hidden min-h-screen lg:fixed lg:inset-y-0 lg:flex">
        {sidebar}
      </div>
      {mobileRail}

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menyunu bağla"
            className="absolute inset-y-0 left-16 right-0 bg-background/75 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <m.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative ml-16 h-full w-72 max-w-[calc(100vw-4rem)]"
          >
            {sidebar}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 bg-background"
              onClick={() => setIsOpen(false)}
              aria-label="Menyunu bağla"
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
          </m.div>
        </div>
      ) : null}

      <div className="pl-16 lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-background/[0.82] backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-normal">
                {title}
              </h1>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">
                {description}
              </p>
            </div>
            {returnHref ? (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={returnHref}>{returnLabel}</Link>
              </Button>
            ) : null}
          </div>
        </header>
        <m.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </m.main>
      </div>
    </div>
  );
}
