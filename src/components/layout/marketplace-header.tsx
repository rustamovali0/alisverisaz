"use client";
import { useMarketplaceText } from "@/i18n/marketplace-copy";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Crown,
  Grid2X2,
  Heart,
  HelpCircle,
  Menu,
  ShoppingBag,
  Store,
  Truck,
  X,
} from "lucide-react";
import { HeaderAccountActions } from "@/components/auth/header-account-actions";
import { MarketplaceBrand } from "@/components/layout/marketplace-brand";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MarketplaceSearch } from "@/components/search/marketplace-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  LanguageCompactDropdown,
  LanguageSwitcher,
} from "@/components/i18n/language-switcher";
import { getCategoryIcon } from "@/components/categories/category-icons";
import { Link, usePathname } from "@/i18n/navigation";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import type { AuthRole } from "@/lib/auth/types";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { MobileNavbarVariant } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";

type MarketplaceHeaderProps = {
  storeId?: string;
  isolatedStorefront?: boolean;
  siteName?: string;
  logoUrl?: string;
  darkLogoUrl?: string;
  stores?: MarketplaceStore[];
  categories?: CategoryOption[];
  searchDefaultValue?: string;
  showMobileSearch?: boolean;
  compactMobileSearch?: boolean;
  showBottomNav?: boolean;
  mobileNavbarVariant?: MobileNavbarVariant;
  storeSubdomainSlug?: string | null;
  storeHomeHref?: string;
  brandHomeHref?: string;
  productsHref?: string;
  searchStoreSlug?: string | null;
  initialRole?: AuthRole | null;
  sticky?: boolean;
  instagramUrl?: string;
  whatsappUrl?: string;
};
function cartCount(storeId?: string) {
  try {
    const value = JSON.parse(localStorage.getItem("alisveris_cart") || "[]");
    return Array.isArray(value)
      ? value
          .filter((item) => !storeId || item.storeId === storeId)
          .reduce(
            (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
            0,
          )
      : 0;
  } catch {
    return 0;
  }
}
export function MarketplaceHeader({
  siteName = "alışveriş",
  logoUrl,
  stores = [],
  categories = [],
  searchDefaultValue,
  showBottomNav = true,
  mobileNavbarVariant,
  storeSubdomainSlug,
  storeHomeHref = "/",
  brandHomeHref = storeHomeHref,
  productsHref = "/products",
  searchStoreSlug,
  initialRole,
  storeId,
  isolatedStorefront = false,
}: MarketplaceHeaderProps) {
  const text = useMarketplaceText();
  const pathname = usePathname();
  const compactAuthHeader =
    /^\/(login|register|forgot-password|reset-password)(\/|$)/.test(pathname);
  const { profile, isResolved } = useClientAuthProfileState();
  const role = isResolved
    ? profile.status === "authenticated"
      ? profile.role
      : null
    : (initialRole ?? null);
  const isSeller = role === "seller";
  const ownsStore =
    isSeller &&
    profile.status === "authenticated" &&
    (profile.storeSlug === searchStoreSlug ||
      stores.some((s) => s.id === storeId && s.ownerId === profile.userId));
  const hideCart = isSeller && (!isolatedStorefront || ownsStore);
  const scopedProducts = isolatedStorefront
    ? `${storeHomeHref === "/" ? "" : storeHomeHref}/products`
    : "/products";
  const categoryHref = (slug: string) =>
    `${scopedProducts}?category=${encodeURIComponent(slug)}`;
  const [count, setCount] = useState(0);
  const [menu, setMenu] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = header.closest<HTMLElement>(".live-marketplace") ?? document.documentElement;
    const syncHeight = () => root.style.setProperty(
      "--marketplace-header-height", `${header.getBoundingClientRect().height}px`,
    );
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--marketplace-header-height");
    };
  }, []);

  useEffect(() => {
    const sync = () =>
      setCount(cartCount(isolatedStorefront ? storeId : undefined));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("alisveris-cart-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("alisveris-cart-updated", sync);
    };
  }, [storeId, isolatedStorefront]);
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("button,a")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
      if (e.key !== "Tab") return;
      const list = menuRef.current?.querySelectorAll<HTMLElement>(
        "a[href],button:not([disabled])",
      );
      if (!list?.length) return;
      const first = list[0],
        last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [menu]);
  const sellerHref = isSeller ? "/store/dashboard" : "/register?role=seller";
  return (
    <>
      {!compactAuthHeader && (
        <div className="live-utility">
          <div className="live-wrap">
            <span>
              <Truck size={14} />
              {text("Azərbaycanın mağazaları — bir ünvanda")}
            </span>
            <div>
              <Link href={sellerHref}>
                {text("Satıcı ol")}
                <ArrowUpRight size={12} />
              </Link>
              <Link href="/help">{text("Yardım mərkəzi")}</Link>
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
      <header
        ref={headerRef}
        className="marketplace-header live-header"
        data-live-header
        data-auth-header={compactAuthHeader || undefined}
      >
        <div className="live-wrap live-header-main">
          <button
            className="live-mobile-menu"
            onClick={() => setMenu(true)}
            aria-label={text("Kateqoriyaları aç")}
          >
            <Menu size={23} />
          </button>
          <MarketplaceBrand
            href={brandHomeHref}
            logoUrl={logoUrl}
            siteName={siteName}
            showDomain={!isolatedStorefront}
          />
          <div className="live-header-search">
            <MarketplaceSearch
              stores={stores}
              defaultValue={searchDefaultValue}
              placeholder={text(
                "Nə axtarırsınız? Məhsul, mağaza və daha çox...",
              )}
              storeSlug={searchStoreSlug ?? undefined}
              searchBaseHref={productsHref.split("#")[0]}
              resultsAnchorId={searchStoreSlug ? "products" : undefined}
              compactActions
              className="live-search-form"
              inputClassName="live-search-input"
              buttonClassName="live-search-submit"
            />
          </div>
          <div className="live-header-actions">
            {!isolatedStorefront && (
              <Link
                href="/favorites"
                className="live-utility-action live-favorites-link"
              >
                <Heart size={22} />
                <span>{text("Sevimlilər")}</span>
              </Link>
            )}
            <div className="live-header-account">
              <HeaderAccountActions showSellerCta={false} />
            </div>
            <div className="live-notifications">
              <NotificationCenter requireAuth={isResolved && profile.status !== "authenticated"} authLoading={!isResolved} />
            </div>
            {!hideCart && (
              <Link
                href={
                  isolatedStorefront
                    ? `${storeHomeHref === "/" ? "" : storeHomeHref}/cart`
                    : "/cart"
                }
                className="live-cart-link"
                aria-label={text("Səbətim, {count} məhsul", { count })}
              >
                <span>
                  <ShoppingBag size={24} />
                  <b aria-hidden="true">{count > 99 ? "99+" : count}</b>
                </span>
                <span>
                  {text("Səbətim")}
                  <small>{text("{count} məhsul", { count })}</small>
                </span>
              </Link>
            )}
          </div>
        </div>
        {!compactAuthHeader && (
          <nav className="live-navigation" aria-label={text("Əsas menyu")}>
            <div className="live-wrap">
              <button
                className="live-all-categories"
                ref={triggerRef}
                onClick={() => setMenu(true)}
                aria-expanded={menu}
                aria-controls="live-category-menu"
              >
                <Grid2X2 size={18} />
                {text("Bütün kateqoriyalar")}
                <ChevronDown size={14} />
              </button>
              <Link
                href={storeHomeHref}
                aria-current={pathname === storeHomeHref ? "page" : undefined}
              >
                {text("Ana səhifə")}
              </Link>
              <Link
                href={scopedProducts}
                prefetch={true}
                aria-current={pathname === "/products" ? "page" : undefined}
              >
                {text("Məhsullar")}
              </Link>
              {isolatedStorefront ? (
                <>
                  <Link href={`${storeHomeHref}#about`}>
                    {text("Mağaza haqqında")}
                  </Link>
                  <Link href={`${storeHomeHref}#contact`}>{text("Əlaqə")}</Link>
                  {ownsStore && (
                    <Link href="/store/dashboard">
                      {text("Mağazanı idarə et")}
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/products?discount=true">
                    {text("Endirimlər")}
                    <span className="live-hot-dot" />
                  </Link>
                  <Link
                    href="/stores"
                    prefetch={true}
                    aria-current={pathname === "/stores" ? "page" : undefined}
                  >
                    {text("Mağazalar")}
                  </Link>
                  <Link href="/products?commerceType=rental">
                    {text("İcarə")}
                  </Link>
                  <Link href="/products?vip=true">
                    <Crown size={15} className="live-gold" />
                    {text("VIP məhsullar")}
                  </Link>
                </>
              )}
              <Link
                href={`${scopedProducts}?sort=newest`}
                className="live-new-collection"
              >
                <i />
                {text("Yeni kəşflər")}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </nav>
        )}
      </header>
      {menu && (
        <div
          className="live-menu-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMenu(false);
          }}
        >
          <div
            className="live-category-menu"
            id="live-category-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label={text("Bütün kateqoriyalar")}
          >
            <div>
              <h2>{text("Alış-verişə başla")}</h2>
              <button
                aria-label={text("Kateqoriyaları bağla")}
                onClick={() => setMenu(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-4 flex items-center justify-between border-b pb-3 md:hidden">
              <LanguageCompactDropdown className="live-mobile-language" menuPlacement="bottom" />
              <ThemeToggle />
            </div>
            <nav>
              {categories.map((category) => {
                const Icon = getCategoryIcon(category);
                return (
                  <Link
                    key={category.id}
                    href={categoryHref(category.slug)}
                    onClick={() => setMenu(false)}
                  >
                    <Icon size={19} />
                    {text(category.name)}
                    <ChevronRight size={15} />
                  </Link>
                );
              })}
              <Link
                href={isolatedStorefront ? scopedProducts : "/categories"}
                onClick={() => setMenu(false)}
              >
                <Grid2X2 size={19} />
                {text("Bütün kateqoriyalara bax")}
                <ArrowRight size={15} />
              </Link>
              {!isolatedStorefront && (
                <Link href="/stores" onClick={() => setMenu(false)}>
                  <Store size={19} />
                  {text("Bütün mağazalar")}
                  <ArrowRight size={15} />
                </Link>
              )}
              <Link href="/help" onClick={() => setMenu(false)}>
                <HelpCircle size={19} />
                {text("Yardım mərkəzi")}
                <ArrowRight size={15} />
              </Link>
            </nav>
          </div>
        </div>
      )}
      {showBottomNav && (
        <MobileBottomNav
          variant={mobileNavbarVariant}
          storeSubdomainSlug={storeSubdomainSlug}
          storeHomeHref={storeHomeHref}
          initialRole={initialRole}
          storeId={storeId}
          isolatedStorefront={isolatedStorefront}
          sellerOwnsStore={ownsStore}
        />
      )}{" "}
    </>
  );
}
