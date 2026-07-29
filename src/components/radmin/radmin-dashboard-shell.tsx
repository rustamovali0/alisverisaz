"use client";

import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardIconView } from "@/components/dashboard/dashboard-icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

type RadminDashboardShellProps = {
  userLabel: string;
  navItems: DashboardNavItem[];
  children: ReactNode;
};

function normalizePath(href: string) {
  if (href === "/radmin") {
    return href;
  }

  return href.replace(/^\/(admin|store\/dashboard)/, "/radmin");
}

function getItemLabel(item: DashboardNavItem) {
  return item.title;
}

function usePersistentBoolean(key: string, initialValue = false) {
  const [value, setValue] = useState(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === "true" || stored === "false") {
        setValue(stored === "true");
      }
    } catch {
      // noop
    }
    setIsHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // noop
    }
  }, [key, isHydrated, value]);

  return [value, setValue] as const;
}

function AdminProfileMenu({ userLabel }: { userLabel: string }) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const initials =
    userLabel
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="h-11 gap-2 rounded-xl px-3"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-xs font-black text-primary">
          {initials}
        </span>
        <span className="hidden max-w-32 truncate text-left lg:inline">{userLabel}</span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </Button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border bg-popover p-2 text-popover-foreground shadow-2xl"
          role="menu"
        >
          <div className="border-b px-3 py-2">
            <p className="truncate text-sm font-semibold">{userLabel}</p>
            <p className="text-xs text-muted-foreground">RAdmin administratoru</p>
          </div>
          <div className="mt-2 grid gap-2">
            <Link
              href="/radmin"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/radmin/settings"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              Parametrlər
            </Link>
            <div className="pt-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RadminDashboardShell({
  userLabel,
  navItems,
  children,
}: RadminDashboardShellProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = usePersistentBoolean("alisveris-radmin-collapsed", false);
  const [search, setSearch] = useState("");

  const activeItem = useMemo(
    () =>
      navItems.find((item) =>
        normalizePath(item.href) === pathname ||
        pathname.startsWith(`${normalizePath(item.href)}/`),
      ) ?? navItems[0],
    [navItems, pathname],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("az-AZ");

    if (!query) {
      return [];
    }

    return navItems.filter((item) => {
      const label = getItemLabel(item).toLocaleLowerCase("az-AZ");
      const href = item.href.toLocaleLowerCase("az-AZ");

      return label.includes(query) || href.includes(query);
    });
  }, [navItems, search]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const sidebarWidth = isCollapsed ? "lg:pl-20" : "lg:pl-80";

  return (
    <div className="min-h-screen bg-slate-100 text-foreground dark:bg-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-800/90 bg-slate-950 text-slate-100 transition-all duration-200 lg:flex",
          isCollapsed ? "w-20" : "w-80",
        )}
      >
        <div className="flex w-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
            <Link href="/radmin" className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                a
              </span>
              {!isCollapsed ? (
                <div>
                  <p className="text-sm font-semibold leading-none">Alisveris.az</p>
                  <p className="text-xs text-slate-400">RAdmin</p>
                </div>
              ) : null}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => setIsCollapsed((current) => !current)}
              aria-label={isCollapsed ? "Sidebari aç" : "Sidebari daralt"}
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </div>
          <div className="border-b border-slate-800 px-5 py-4">
            {!isCollapsed ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Naviqasiya
                </p>
                <p className="mt-2 text-sm text-slate-300">{userLabel}</p>
              </>
            ) : null}
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const href = normalizePath(item.href);
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              const Icon = (
                <DashboardIconView
                  name={item.icon}
                  className={cn("size-4 shrink-0", isActive ? "text-white" : "text-slate-400")}
                />
              );

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    isCollapsed && "justify-center px-2",
                  )}
                >
                  {Icon}
                  {!isCollapsed ? (
                    <>
                      <span className="min-w-0 flex-1 truncate">{getItemLabel(item)}</span>
                      {item.badgeText ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {item.badgeText}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-800 p-4">
            {!isCollapsed ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Sessiya
                </p>
                <p className="mt-2 truncate text-sm text-slate-200">{userLabel}</p>
              </div>
            ) : null}
            <div className="mt-3">
              <LogoutButton compact={isCollapsed} />
            </div>
          </div>
        </div>
      </aside>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Sidebari bağla"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(82vw,20rem)] bg-slate-950 text-slate-100 shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
              <Link href="/radmin" className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                  a
                </span>
                <span className="font-semibold">Alisveris.az</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Sidebari bağla"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="h-[calc(100vh-4rem)] overflow-y-auto p-3">
              {navItems.map((item) => {
                const href = normalizePath(item.href);
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    )}
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    <DashboardIconView name={item.icon} className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{getItemLabel(item)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn("min-h-screen", sidebarWidth)}>
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Sidebari aç"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {activeItem ? getItemLabel(activeItem) : "Dashboard"}
              </p>
              <p className="truncate text-base font-semibold text-foreground sm:text-lg">
                {userLabel}
              </p>
            </div>
            <div className="relative hidden min-w-[280px] max-w-md flex-1 lg:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="İstifadəçi, məhsul, mağaza..."
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              {filteredItems.length > 0 ? (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-full rounded-xl border bg-popover p-2 shadow-xl">
                  {filteredItems.slice(0, 6).map((item) => (
                    <Link
                      key={item.href}
                      href={normalizePath(item.href)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => setSearch("")}
                    >
                      <span>{getItemLabel(item)}</span>
                      <span className="text-xs text-muted-foreground">{item.href}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <ThemeToggle />
            <AdminProfileMenu userLabel={userLabel} />
          </div>
          <div className="border-t border-slate-200/70 px-4 py-3 text-sm text-muted-foreground dark:border-slate-800 sm:px-6 lg:px-8">
            <span className="font-medium text-foreground">Hazır bölmə:</span>{" "}
            {activeItem ? getItemLabel(activeItem) : "Dashboard"}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
