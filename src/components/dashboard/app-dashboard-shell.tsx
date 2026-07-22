"use client";

import { Menu, X } from "lucide-react";
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
    <aside className="glass-panel flex h-full w-72 flex-col border-r">
      <div className="border-b px-5 py-5">
        <Link href="/" className="block text-lg font-semibold tracking-normal text-foreground">
          alisveris.az
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

  return (
    <div className="min-h-screen bg-background soft-grid-bg">
      <div className="hidden min-h-screen lg:fixed lg:inset-y-0 lg:flex">
        {sidebar}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menyunu bağla"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <m.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative h-full"
          >
            {sidebar}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-72 top-3 ml-2 bg-background"
              onClick={() => setIsOpen(false)}
              aria-label="Menyunu bağla"
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
          </m.div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-background/[0.82] backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsOpen(true)}
              aria-label="Menyunu aç"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
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
