"use client";

import {
  ArrowUpRight,
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardIconView } from "@/components/dashboard/dashboard-icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Link, usePathname } from "@/i18n/navigation";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import {
  activeRadminItem,
  groupRadminNavigation,
} from "@/lib/dashboard/radmin-navigation";
import { radminPanelHref } from "@/lib/auth/radmin-paths";

type Props = {
  userLabel: string;
  navItems: DashboardNavItem[];
  children: ReactNode;
  siteName?: string;
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
};

export function RadminDashboardShell({
  userLabel,
  navItems,
  children,
  siteName = "Alisveris.az",
  logoUrl,
  darkLogoUrl,
}: Props) {
  const pathname = radminPanelHref(usePathname());
  const active = activeRadminItem(navItems, pathname);
  const activeTitle =
    !active || radminPanelHref(active.href) === "/radmin/panel"
      ? "Ümumi baxış"
      : active.title;
  const groups = useMemo(() => groupRadminNavigation(navItems), [navItems]);
  const activeGroup = groups.find((group) =>
    group.items.some(
      (item) => item.href === radminPanelHref(active?.href || ""),
    ),
  )?.id;
  const [openGroup, setOpenGroup] = useState(activeGroup || "");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const filtered = useMemo(
    () => groupRadminNavigation(navItems, search),
    [navItems, search],
  );

  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem("alisveris-radmin-collapsed") === "true",
      );
    } catch {
      /* storage may be unavailable */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated)
      try {
        localStorage.setItem("alisveris-radmin-collapsed", String(collapsed));
      } catch {
        /* optional preference */
      }
  }, [collapsed, hydrated]);
  useEffect(() => {
    setOpenGroup(activeGroup || "");
    setDrawerOpen(false);
    setProfileOpen(false);
  }, [pathname, activeGroup]);
  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("button, a, input")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = [
        ...(drawerRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled])",
        ) || []),
      ].filter((el) => el.getClientRects().length);
      const first = elements[0],
        last = elements[elements.length - 1];
      if (!first) return;
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !drawerRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !drawerRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    const media = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => {
      if (media.matches) setDrawerOpen(false);
    };
    media.addEventListener("change", onBreakpoint);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      media.removeEventListener("change", onBreakpoint);
      (previousFocus?.isConnected
        ? previousFocus
        : triggerRef.current
      )?.focus();
    };
  }, [drawerOpen]);
  useEffect(() => {
    if (!profileOpen) return;
    const close = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileTriggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [profileOpen]);

  function navigation(compact: boolean, mobile = false) {
    const displayGroups = search.trim() ? filtered : groups;
    return (
      <>
        {!compact && (
          <label className="ra-nav-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Bölmə axtar</span>
            <input
              placeholder="Bölmə axtar"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Axtarışı təmizlə"
              >
                <X size={16} />
              </button>
            )}
          </label>
        )}
        <nav
          className="ra-navigation"
          aria-label={mobile ? "Mobil idarəetmə menyusu" : "İdarəetmə menyusu"}
        >
          <Link
            href="/radmin/panel"
            className="ra-nav-link"
            aria-current={activeTitle === "Ümumi baxış" ? "page" : undefined}
            title={compact ? "Ümumi baxış" : undefined}
            onClick={() => setDrawerOpen(false)}
          >
            <DashboardIconView name="home" className="size-5" />
            <span className={compact ? "sr-only" : ""}>Ümumi baxış</span>
          </Link>
          {displayGroups.map((group) => {
            const expanded = Boolean(search.trim()) || openGroup === group.id;
            return (
              <div className="ra-nav-group" key={group.id}>
                {!compact && (
                  <button
                    className="ra-group-toggle"
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`${mobile ? "mobile" : "desktop"}-${group.id}`}
                    onClick={() => setOpenGroup(expanded ? "" : group.id)}
                  >
                    <span>{group.title}</span>
                    <ChevronDown
                      size={16}
                      className={expanded ? "ra-rotated" : ""}
                    />
                  </button>
                )}
                <div
                  id={`${mobile ? "mobile" : "desktop"}-${group.id}`}
                  hidden={!compact && !expanded}
                >
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="ra-nav-link"
                      title={compact ? item.title : undefined}
                      aria-current={
                        active && radminPanelHref(active.href) === item.href
                          ? "page"
                          : undefined
                      }
                      onClick={() => setDrawerOpen(false)}
                    >
                      <DashboardIconView name={item.icon} className="size-5" />
                      <span className={compact ? "sr-only" : "ra-nav-label"}>
                        {item.title}
                      </span>
                      {item.badgeText && !compact && (
                        <small>{item.badgeText}</small>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {search.trim() && !filtered.length && (
            <p className="ra-no-results" role="status">
              Uyğun bölmə tapılmadı.
            </p>
          )}
        </nav>
      </>
    );
  }

  function brand() {
    return (
      <Link
        href="/radmin/panel"
        className="ra-brand"
        aria-label={`${siteName} idarəetmə paneli`}
      >
        <span className="ra-brand-icon">
          {logoUrl || darkLogoUrl ? (
            <img
              src={logoUrl || darkLogoUrl || ""}
              alt=""
              width={34}
              height={34}
            />
          ) : (
            "A"
          )}
        </span>
        <span className="ra-brand-name">
          {siteName}
          <small>İdarəetmə paneli</small>
        </span>
      </Link>
    );
  }

  return (
    <div className={`radmin-shell ra-shell${collapsed ? " ra-collapsed" : ""}`}>
      <a href="#radmin-content" className="ra-skip">
        Məzmuna keç
      </a>
      <aside className="ra-sidebar">
        <div className="ra-sidebar-head">
          {brand()}
          <button
            type="button"
            className="ra-icon-button ra-collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Menyunu genişləndir" : "Menyunu daralt"}
          >
            {collapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
          </button>
        </div>
        <div className="ra-nav-body">{navigation(collapsed)}</div>
        <div className="ra-sidebar-footer">
          {!collapsed && (
            <div className="ra-account">
              <strong title={userLabel}>{userLabel}</strong>
              <span>Administrator</span>
            </div>
          )}
          <LogoutButton compact />
        </div>
      </aside>
      {drawerOpen && (
        <div className="ra-drawer-layer">
          <button
            type="button"
            className="ra-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-label="Menyunu bağla"
            tabIndex={-1}
          />
          <aside
            ref={drawerRef}
            className="ra-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="İdarəetmə menyusu"
          >
            <div className="ra-sidebar-head">
              {brand()}
              <button
                type="button"
                className="ra-icon-button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Menyunu bağla"
              >
                <X size={21} />
              </button>
            </div>
            <div className="ra-nav-body">{navigation(false, true)}</div>
            <div className="ra-sidebar-footer">
              <div className="ra-account">
                <strong>{userLabel}</strong>
                <span>Administrator</span>
              </div>
              <LogoutButton compact />
            </div>
          </aside>
        </div>
      )}
      <div className="ra-workspace" inert={drawerOpen ? true : undefined}>
        <header className="ra-topbar">
          <div className="ra-page-heading">
            <button
              ref={triggerRef}
              type="button"
              className="ra-icon-button ra-mobile-menu"
              onClick={() => setDrawerOpen(true)}
              aria-label="Menyunu aç"
              aria-expanded={drawerOpen}
            >
              <Menu size={22} />
            </button>
            <div>
              <p>İdarəetmə</p>
              <h1>{activeTitle}</h1>
            </div>
          </div>
          <div className="ra-topbar-actions">
            <Link href="/" className="ra-site-link">
              Sayta bax <ArrowUpRight size={16} />
            </Link>
            <ThemeToggle
              className="ra-icon-button"
              iconClassName="size-5 md:size-5"
            />
            <div ref={profileRef} className="ra-profile">
              <button
                ref={profileTriggerRef}
                type="button"
                className="ra-avatar"
                aria-label="Hesab menyusu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                {userLabel.slice(0, 2).toLocaleUpperCase("az-AZ")}
              </button>
              {profileOpen && (
                <div className="ra-profile-menu">
                  <strong>{userLabel}</strong>
                  <span>Administrator</span>
                  <Link href="/" onClick={() => setProfileOpen(false)}>
                    Sayta bax ↗
                  </Link>
                  <Link
                    href="/radmin/mfa"
                    onClick={() => setProfileOpen(false)}
                  >
                    İki mərhələli təsdiq
                  </Link>
                  <LogoutButton />
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="radmin-content" className="ra-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
