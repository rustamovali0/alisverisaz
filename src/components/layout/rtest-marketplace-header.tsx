"use client";

import { ArrowUpRight, ChevronDown, CircleHelp, Heart, LayoutGrid, Menu, Plus, Search, ShoppingBag, Store, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import type { MarketplaceHeaderProps } from "@/components/layout/marketplace-header";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCategoryIcon } from "@/components/categories/category-icons";
import { Link, usePathname } from "@/i18n/navigation";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import { cn } from "@/lib/utils";

function cartQuantity() {
  try {
    const values = JSON.parse(localStorage.getItem("alisveris_cart") || "[]");
    return Array.isArray(values) ? values.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0) : 0;
  } catch { return 0; }
}

export function RtestMarketplaceHeader({
  siteName = "Alışveriş", logoUrl, stores = [], categories = [], searchDefaultValue,
  showMobileSearch = true, showBottomNav = true, mobileNavbarVariant,
  storeSubdomainSlug, storeHomeHref = "/", brandHomeHref = storeHomeHref,
  productsHref = "/products", searchStoreSlug, initialRole, sticky = true,
}: MarketplaceHeaderProps) {
  const pathname = usePathname();
  const nav = useTranslations("nav");
  const common = useTranslations("common");
  const { profile, isResolved } = useClientAuthProfileState();
  const role = !isResolved && initialRole ? initialRole : profile.status === "authenticated" ? profile.role : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [count, setCount] = useState(0);
  const drawer = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const name = !siteName || siteName.toLowerCase().includes("alisveris") ? "Alışveriş" : siteName;
  const suppressSearch = /^\/(radmin|admin|dashboard|seller|login|register|forgot-password|store\/dashboard)(\/|$)/.test(pathname);
  const navigation = [
    { href: productsHref, label: nav("products") },
    { href: "/products?sort=newest", label: "Yeni gələnlər" },
    { href: "/stores", label: "Mağazalar" },
    { href: "/about", label: nav("about") },
  ];
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const sync = () => setCount(cartQuantity());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("alisveris-cart-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("alisveris-cart-updated", sync);
    };
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const scroll = window.scrollY;
    const previous = { overflow: document.body.style.overflow, position: document.body.style.position, top: document.body.style.top, width: document.body.style.width };
    Object.assign(document.body.style, { overflow: "hidden", position: "fixed", top: `-${scroll}px`, width: "100%" });
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key !== "Tab") return;
      const elements = Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),select,[tabindex="0"]') || []).filter(element => element.getClientRects().length);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      Object.assign(document.body.style, previous);
      window.scrollTo(0, scroll);
      document.removeEventListener("keydown", keydown);
      menuButton.current?.focus();
    };
  }, [menuOpen]);

  const brand = <><span className="atelier-brand-symbol">{logoUrl ? <img src={logoUrl} alt="" width={28} height={28} /> : <ShoppingBag size={24} strokeWidth={1.6} aria-hidden="true" />}</span><span>{name}<span className="atelier-domain">.az</span></span></>;
  const search = <MarketplaceSearch stores={stores} defaultValue={searchDefaultValue} storeSlug={searchStoreSlug || undefined} className="atelier-search" inputClassName="atelier-search-input" buttonClassName="atelier-search-button" placeholder="Məhsul, mağaza və ya kateqoriya..." />;
  return <>
    <header className={cn("marketplace-header atelier-header", sticky && "atelier-header-sticky")}>
      <div className="atelier-topline"><div className="atelier-container"><span>Seçim səndən. Alışveriş bir yerdə.</span><div><Link href="/help">Yardım</Link><Link href="/register?role=seller">Mağaza aç <ArrowUpRight size={12} aria-hidden="true" /></Link></div></div></div>
      <div className="atelier-container atelier-header-main">
        <button ref={menuButton} type="button" className="atelier-icon-button atelier-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Menyunu aç" aria-expanded={menuOpen}><Menu size={21} aria-hidden="true" /></button>
        <Link href={brandHomeHref} className="atelier-brand" aria-label={`${name} ana səhifə`}>{brand}</Link>
        {!suppressSearch ? <div className="atelier-desktop-search">{search}</div> : <div className="atelier-header-spacer" />}
        <div className="atelier-header-actions">
          {role ? <NotificationCenter buttonClassName="atelier-icon-button" iconClassName="size-5" /> : null}
          <Link href="/favorites" className="atelier-icon-button atelier-favorites-link" title={nav("favorites")} aria-label={nav("favorites")}><Heart size={21} strokeWidth={1.7} aria-hidden="true" /></Link>
          <Link href="/cart" className="atelier-cart-link" title={common("cart")}><span className="atelier-cart-icon"><ShoppingBag size={21} strokeWidth={1.7} aria-hidden="true" />{count > 0 ? <span className="atelier-count">{count > 99 ? "99+" : count}</span> : null}</span><span className="atelier-action-label">{common("cart")}</span></Link>
          <div className="atelier-account"><HeaderAccountActions showSellerCta={false} /></div>
          {role === "seller" ? <Link href="/sell/product/new" className="atelier-add-product" title="Məhsul əlavə et"><Plus size={18} aria-hidden="true" /><span>Məhsul əlavə et</span></Link> : null}
        </div>
      </div>
      {!suppressSearch && showMobileSearch ? <div className="atelier-container atelier-mobile-search">{search}</div> : null}
      {!suppressSearch ? <div className="atelier-navigation-border"><nav className="atelier-container atelier-navigation" aria-label="Əsas naviqasiya">
        <details className="atelier-category-menu"><summary><LayoutGrid size={17} aria-hidden="true" />Kateqoriyalar<ChevronDown size={14} aria-hidden="true" /></summary><div className="atelier-category-dropdown">{categories.map(category => { const Icon = getCategoryIcon(category); return <Link key={category.id} href={`/products?category=${category.slug}`}><Icon size={18} aria-hidden="true" /><span>{category.name}</span></Link>; })}<Link href="/categories"><LayoutGrid size={18} aria-hidden="true" />Bütün kateqoriyalar</Link></div></details>
        {navigation.map(item => <Link key={item.href} href={item.href} className={cn(pathname === item.href.split("?")[0] && "is-active")}>{item.label}</Link>)}
        <Link href="/register?role=seller" className="atelier-seller-link"><Store size={15} aria-hidden="true" />Satıcı ol<ArrowUpRight size={14} aria-hidden="true" /></Link>
      </nav></div> : null}
    </header>
    {menuOpen ? <div className="atelier-menu-layer" role="dialog" aria-modal="true" aria-label="Menyu">
      <button className="atelier-menu-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Menyunu bağla" />
      <aside className="atelier-drawer" ref={drawer}>
        <div className="atelier-drawer-heading"><Link href={brandHomeHref} className="atelier-brand" onClick={() => setMenuOpen(false)}>{brand}</Link><button className="atelier-icon-button" type="button" ref={closeButton} onClick={() => setMenuOpen(false)} aria-label="Bağla"><X size={20} aria-hidden="true" /></button></div>
        <div className="atelier-drawer-account"><HeaderAccountActions showSellerCta={false} /></div>
        {role === "seller" ? <Link href="/sell/product/new" className="atelier-primary-link" onClick={() => setMenuOpen(false)}><Plus size={18} aria-hidden="true" />Məhsul əlavə et</Link> : null}
        <nav aria-label="Mobil menyu" className="atelier-drawer-links">{[
          { href: "/products", label: nav("products"), icon: ShoppingBag },
          { href: "/stores", label: "Mağazalar", icon: Store },
          { href: "/categories", label: "Kateqoriyalar", icon: LayoutGrid },
          { href: "/favorites", label: nav("favorites"), icon: Heart },
          { href: "/help", label: "Yardım və əlaqə", icon: CircleHelp },
        ].map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><item.icon size={19} strokeWidth={1.7} aria-hidden="true" /><span>{item.label}</span><ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>
        <div className="atelier-drawer-categories"><span className="atelier-eyebrow">Kateqoriyalar</span>{categories.slice(0, 8).map(category => <Link key={category.id} href={`/products?category=${category.slug}`} onClick={() => setMenuOpen(false)}>{category.name}<ChevronDown size={13} className="-rotate-90" aria-hidden="true" /></Link>)}</div>
        <div className="atelier-drawer-settings"><span>Dil</span><LanguageSwitcher /><span>Görünüş</span><ThemeToggle className="atelier-icon-button" iconClassName="size-[18px]" /></div>
      </aside>
    </div> : null}
    {showBottomNav ? <MobileBottomNav variant={mobileNavbarVariant} storeSubdomainSlug={storeSubdomainSlug} storeHomeHref={storeHomeHref} initialRole={initialRole} /> : null}
  </>;
}
