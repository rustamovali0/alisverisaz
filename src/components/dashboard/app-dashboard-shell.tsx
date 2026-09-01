"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { m } from "framer-motion";

import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardIconView } from "@/components/dashboard/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

type AppDashboardShellProps = {
  title: string;
  description: string;
  userLabel: string;
  navItems: DashboardNavItem[];
  returnHref?: string;
  returnLabel?: string;
  returnAction?: "link" | "logout";
  mobileRail?: boolean;
  children: ReactNode;
};

function getPathWithoutHash(href: string) {
  return href.split(/[?#]/)[0];
}

function getActiveNavHref(navItems: DashboardNavItem[], pathname: string, hash: string) {
  const exactHashMatch = navItems.find((item) => {
    const [path, fragment] = item.href.split("#");
    return Boolean(fragment) && path === pathname && `#${fragment}` === hash;
  });

  if (exactHashMatch) {
    return exactHashMatch.href;
  }

  return navItems
    .filter((item) => !item.href.includes("#"))
    .filter((item) => {
      const href = getPathWithoutHash(item.href);
      return pathname === href || pathname.startsWith(`${href}/`);
    })
    .sort((left, right) => getPathWithoutHash(right.href).length - getPathWithoutHash(left.href).length)[0]
    ?.href;
}

export function AppDashboardShell({
  title,
  description,
  userLabel,
  navItems,
  returnHref,
  returnLabel = "Sayta qayıt",
  returnAction = "link",
  mobileRail = true,
  children,
}: AppDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const [isOpen, setIsOpen] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const activeHref = useMemo(() => getActiveNavHref(navItems, pathname, hash), [hash, navItems, pathname]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      navItems.forEach((item) => router.prefetch(getPathWithoutHash(item.href)));
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [navItems, router]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

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

  function handleDashboardLinkClick() {
    setIsOpen(false);
    resetDashboardScroll();
  }

  function adminGroupTitle(href: string) {
    if (!href.startsWith("/radmin")) {
      return null;
    }

    if (href === "/radmin" || href.includes("activity") || href.includes("audit")) {
      return "ÜMUMİ";
    }

    if (href.includes("orders") || href.includes("payments")) {
      return "SATIŞ";
    }

    if (href.includes("products") || href.includes("categories") || href.includes("reviews")) {
      return "KATALOQ";
    }

    if (href.includes("stores") || href.includes("users") || href.includes("subscriptions")) {
      return "SATICILAR";
    }

    if (
      href.includes("site-management") ||
      href.includes("homepage") ||
      href.includes("menus") ||
      href.includes("themes") ||
      href.includes("media") ||
      href.includes("locations") ||
      href.includes("settings") ||
      href.includes("panel-management")
    ) {
      return "SAYT İDARƏETMƏSİ";
    }

    return "SİSTEM";
  }

  function renderNavItems({ compact = false }: { compact?: boolean } = {}) {
    let previousGroup: string | null = null;

    return navItems.map((item) => {
      const active = activeHref === item.href;
      const group = adminGroupTitle(item.href);
      const showGroup = Boolean(group && group !== previousGroup);
      previousGroup = group;

      return (
        <Fragment key={item.href}>
          {showGroup && !compact ? (
            <p className="px-3 pt-3 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground first:pt-0">
              {group}
            </p>
          ) : null}
          <Link
            href={item.href}
            prefetch
            onClick={handleDashboardLinkClick}
            title={compact ? item.titleKey ? t(item.titleKey as any) : item.title : undefined}
            aria-label={compact ? item.titleKey ? t(item.titleKey as any) : item.title : undefined}
            className={cn(
              compact
                ? "grid size-11 place-items-center rounded-xl border text-muted-foreground transition-all duration-200"
                : "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200",
              active
                ? compact
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : compact
                  ? "border-transparent bg-background/70 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/10 hover:text-foreground"
                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-primary/10 hover:text-foreground",
            )}
          >
            <DashboardIconView name={item.icon} className={compact ? "size-6 shrink-0" : "size-5 shrink-0"} />
            {compact ? null : <span>{item.titleKey ? t(item.titleKey as any) : item.title}</span>}
          </Link>
        </Fragment>
      );
    });
  }

  function renderMobileCardNavigation() {
    return (
      <nav className="grid grid-cols-2 gap-2 px-3 pt-3 lg:hidden">
        {navItems.map((item) => {
          const active = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={handleDashboardLinkClick}
              className={cn(
                "flex min-h-12 min-w-0 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-bold shadow-sm transition",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              <DashboardIconView name={item.icon} className="size-5 shrink-0" />
              <span className="min-w-0 truncate">{item.titleKey ? t(item.titleKey as any) : item.title}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  const sidebar = (
    <aside className="glass-panel flex h-full w-72 max-w-[calc(100vw-4rem)] flex-col border-r">
      <div className="border-b px-5 py-5">
        <Link href="/" className="block text-lg font-semibold tracking-normal text-foreground">
          Alışveriş
        </Link>
        <p className="mt-1 truncate text-sm text-muted-foreground">{userLabel}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-3" data-dashboard-scroll-root>
        {renderNavItems()}
      </nav>
      <div className="border-t p-3">
        <LogoutButton />
      </div>
    </aside>
  );

  const mobileRailNavigation = (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r bg-background/95 shadow-lg shadow-slate-950/5 backdrop-blur-xl lg:hidden">
      <div className="grid h-16 place-items-center border-b">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setIsOpen(true)}
          aria-label="Menyunu böyüt"
          aria-expanded={isOpen}
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-3" data-dashboard-scroll-root>
        {renderNavItems({ compact: true })}
      </nav>
      <div className="border-t p-2">
        <LogoutButton compact />
      </div>
    </aside>
  );

  return (
    <div className="app-dashboard-shell min-h-screen min-w-0 overflow-x-clip bg-background soft-grid-bg">
      <div className={cn("hidden min-h-screen lg:fixed lg:flex", mobileRail ? "lg:inset-y-0" : "lg:bottom-0 lg:top-[73px]")}>
        {sidebar}
      </div>
      {mobileRail ? mobileRailNavigation : null}

      {isOpen && mobileRail ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Menyunu bağla"
            className={cn("absolute inset-y-0 right-0 bg-background/75 backdrop-blur-sm", mobileRail ? "left-16" : "left-0")}
            onClick={() => setIsOpen(false)}
          />
          <m.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn("relative h-full w-72 max-w-[calc(100vw-4rem)]", mobileRail && "ml-16")}
          >
            {sidebar}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 size-12 rounded-xl bg-background shadow-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Menyunu bağla"
            >
              <X className="size-7 stroke-[2.6]" aria-hidden="true" />
            </Button>
          </m.div>
        </div>
      ) : null}

      <div className={cn(mobileRail ? "pl-16" : "pl-0", "min-w-0 lg:pl-72")}>
        <header className={cn("z-30 border-b bg-background/[0.82] backdrop-blur-xl", mobileRail && "sticky top-0")}>
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
            {!mobileRail ? (
              null
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-normal">
                {title}
              </h1>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">
                {description}
              </p>
            </div>
            {returnAction === "logout" ? (
              <LogoutButton className="shrink-0" />
            ) : returnHref ? (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={returnHref} prefetch onClick={() => handleDashboardLinkClick()}>{returnLabel}</Link>
              </Button>
            ) : null}
          </div>
        </header>
        {!mobileRail ? renderMobileCardNavigation() : null}
        <main className="min-w-0 max-w-full overflow-x-clip px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:py-6 lg:px-8 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
