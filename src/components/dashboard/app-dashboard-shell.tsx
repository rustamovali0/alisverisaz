"use client";

import { ArrowLeft, Bell, ChevronLeft, ChevronRight, ExternalLink, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardIconView } from "@/components/dashboard/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

type Props = { title: string; description: string; userLabel: string; navItems: DashboardNavItem[]; returnHref?: string; returnLabel?: string; returnAction?: "link" | "logout"; mobileRail?: boolean; children: ReactNode };
const pathOnly = (href: string) => href.split(/[?#]/)[0];

function findActive(items: DashboardNavItem[], pathname: string) {
  return items.filter((item) => !item.href.includes("#")).filter((item) => pathname === pathOnly(item.href) || pathname.startsWith(`${pathOnly(item.href)}/`)).sort((a, b) => pathOnly(b.href).length - pathOnly(a.href).length)[0]?.href;
}

export function AppDashboardShell({ title, description, userLabel, navItems, returnHref = "/", returnLabel = "Sayta qayıt", returnAction = "link", children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const selectedHref = useMemo(() => findActive(navItems, pathname), [navItems, pathname]);
  const selected = navItems.find((item) => item.href === selectedHref);
  const selectedTitle = selected ? (selected.titleKey ? t(selected.titleKey as never) : selected.title) : title;
  const root = pathname.startsWith("/radmin") ? "/radmin" : pathname.startsWith("/store/dashboard") || pathname.startsWith("/sell/product") ? "/store/dashboard" : "/dashboard";
  const isRoot = pathname === root;
  const notifications = navItems.find((item) => item.href.includes("notifications") || item.href.includes("messages"));

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const label = (item: DashboardNavItem) => item.titleKey ? t(item.titleKey as never) : item.title;
  const navigation = (compact = false) => <nav className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-4" aria-label="İdarə paneli bölmələri">
    {navItems.map((item) => {
      const active = selectedHref === item.href;
      return <Link key={item.href} href={item.href} prefetch={false} onMouseEnter={() => router.prefetch(pathOnly(item.href))} onClick={() => setDrawerOpen(false)} title={compact ? label(item) : undefined} aria-current={active ? "page" : undefined} className={cn("group flex min-h-11 items-center rounded-xl text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40", compact ? "justify-center px-2" : "gap-3 px-3", active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-slate-600 hover:bg-primary/10 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white")}>
        <DashboardIconView name={item.icon} className="size-5 shrink-0" />
        {compact ? null : <span className="min-w-0 flex-1 truncate">{label(item)}</span>}
        {!compact && item.badgeText ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{item.badgeText}</span> : null}
      </Link>;
    })}
  </nav>;

  const sidebar = (mobile = false) => <aside className={cn("flex h-full flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95", mobile ? "w-[min(19rem,calc(100vw-2rem))] shadow-2xl" : collapsed ? "w-20" : "w-72")}>
    <div className={cn("flex h-20 items-center border-b border-slate-200 px-4 dark:border-slate-800", collapsed ? "justify-center" : "gap-3")}>
      <Link href="/" className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-orange-100 bg-white p-1 shadow-sm dark:border-orange-500/20 dark:bg-slate-900"><img src="/brand/alisveris-logo.svg" alt="Alışveriş" className="size-full object-contain" /></Link>
      {!collapsed || mobile ? <div className="min-w-0"><p className="font-black tracking-tight text-slate-950 dark:text-white">Alışveriş</p><p className="truncate text-xs text-slate-500">{userLabel}</p></div> : null}
    </div>
    {navigation(!mobile && collapsed)}
    <div className="border-t border-slate-200 p-3 dark:border-slate-800"><LogoutButton compact={!mobile && collapsed} /></div>
  </aside>;

  return <div className="app-dashboard-shell min-h-screen overflow-x-clip bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
    <div className={cn("fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block", collapsed ? "w-20" : "w-72")}>{sidebar()}</div>
    {drawerOpen ? <div className="fixed inset-0 z-[80] lg:hidden"><button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-label="Menyunu bağla" onClick={() => setDrawerOpen(false)} /><div className="relative h-full animate-in slide-in-from-left duration-200">{sidebar(true)}<Button variant="secondary" size="icon" className="absolute right-3 top-3 size-10" onClick={() => setDrawerOpen(false)} aria-label="Menyunu bağla"><X className="size-5" /></Button></div></div> : null}
    <div className={cn("min-w-0 transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-72")}>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 shadow-[0_8px_28px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/88"><div className="flex min-h-16 items-center gap-2 px-3 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Panel menyusunu aç"><Menu className="size-5" /></Button>
        <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Menyunu böyüt" : "Menyunu yığ"}>{collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}</Button>
        {!isRoot ? <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Geri qayıt"><ArrowLeft className="size-5" /></Button> : null}
        <div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Link href={root} className="hover:text-primary">{title}</Link>{!isRoot ? <Fragment><ChevronRight className="size-3" /><span className="truncate">{selectedTitle}</span></Fragment> : null}</div><h1 className="truncate text-lg font-black tracking-tight sm:text-xl">{selectedTitle}</h1>{isRoot ? <p className="hidden truncate text-xs text-slate-500 sm:block">{description}</p> : null}</div>
        {notifications ? <Button asChild variant="ghost" size="icon" className="rounded-full"><Link href={notifications.href} aria-label="Bildirişlər"><Bell className="size-5" /></Link></Button> : null}
        {returnAction === "logout" ? <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link href="/" target="_blank" rel="noopener noreferrer">Mağazaya bax <ExternalLink className="ml-1.5 size-4" /></Link></Button> : <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><Link href={returnHref}>{returnLabel}</Link></Button>}
      </div></header>
      <main className="min-w-0 px-3 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8 lg:py-8"><div className="mx-auto w-full max-w-[1480px]">{children}</div></main>
    </div>
  </div>;
}
