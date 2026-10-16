"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { InfiniteProductGrid } from "@/components/cart/product-marketplace";
import { getCategoryIcon } from "@/components/categories/category-icons";
import { OptimizedImage } from "@/components/common/optimized-image";
import type { HomeExperienceProps } from "@/components/home/home-experience";
import { SiteFooter } from "@/components/layout/site-footer";
import { Link } from "@/i18n/navigation";
import { getStorePath } from "@/lib/config/domains";

export function RtestHomeExperience({
  locale, siteSettings, sections, stores, products, productNextCursor, productHasMore,
  categories, initialRole,
}: HomeExperienceProps) {
  const marketplace = useTranslations("marketplace");
  const hero = sections.find(section => section.key === "hero");
  const categorySection = sections.find(section => section.key === "categories");
  const storeSection = sections.find(section => section.key === "featured_products");
  const heroImage = hero?.imageUrl && !hero.imageUrl.includes("auth-banner") ? hero.imageUrl : "/design/atelier-shopping.webp";
  const mobileImage = typeof hero?.settings?.mobileImageUrl === "string" && hero.settings.mobileImageUrl.trim() ? hero.settings.mobileImageUrl.trim() : heroImage;
  const selectedIds = Array.isArray(storeSection?.settings?.storeIds) ? storeSection.settings.storeIds : [];
  const featuredStores = (selectedIds.length ? stores.filter(store => selectedIds.includes(store.id)) : stores).slice(0, storeSection?.itemLimit || 6);
  const rootCategories = categories.filter(category => !category.parentId).slice(0, categorySection?.itemLimit || 10);
  const displayCategories = rootCategories.length ? rootCategories : categories.slice(0, 10);
  return <main className="atelier-marketplace atelier-home-v2">
    <section className="atelier-container atelier-discovery-heading" aria-labelledby="atelier-home-title">
      <div><span className="atelier-eyebrow">Alışveriş.az</span><h1 id="atelier-home-title">Mağazalar və məhsullar</h1></div>
      <Link href={initialRole === "seller" ? "/sell/product/new" : "/stores"} className="atelier-text-link">{initialRole === "seller" ? "Məhsul əlavə et" : "Mağazaları kəşf et"}<ArrowUpRight size={17} aria-hidden="true" /></Link>
    </section>

    {displayCategories.length ? <section className="atelier-category-band" aria-label="Kateqoriyalar"><div className="atelier-container atelier-categories">{displayCategories.map(category => { const Icon = getCategoryIcon(category); return <Link href={`/products?category=${category.slug}`} className="atelier-category" key={category.id}><span><Icon size={25} strokeWidth={1.45} aria-hidden="true" /></span><span>{category.name}</span></Link>; })}<Link href="/categories" className="atelier-category atelier-category-all"><span><ArrowUpRight size={24} strokeWidth={1.5} aria-hidden="true" /></span><span>Hamısına bax</span></Link></div></section> : null}

    <div className="atelier-container atelier-home-content">
      <section aria-labelledby="atelier-latest-title"><div className="atelier-section-heading"><div><span className="atelier-eyebrow">Yeni kəşflər</span><h2 id="atelier-latest-title">Vitrinə yeni əlavə olunanlar</h2></div><Link href="/products" className="atelier-text-link">Bütün məhsullar<ArrowUpRight size={17} aria-hidden="true" /></Link></div><InfiniteProductGrid initialProducts={products} initialCursor={productNextCursor} initialHasMore={productHasMore} locale={locale} sort="newest" compactMobileCards labels={{ stock: marketplace("stock") }} /></section>

      {featuredStores.length ? <section className="atelier-stores-section" aria-labelledby="atelier-stores-title"><div className="atelier-section-heading"><div><span className="atelier-eyebrow">Birbaşa mağazalardan</span><h2 id="atelier-stores-title">Öz mağazanı kəşf et</h2></div><Link href="/stores" className="atelier-text-link">Hamısına bax<ArrowUpRight size={17} aria-hidden="true" /></Link></div><div className="atelier-store-grid">{featuredStores.map(store => <Link href={getStorePath(store.slug)} className="atelier-store-item" key={store.id}><span className="atelier-store-avatar">{store.logoUrl ? <OptimizedImage src={store.logoUrl} alt="" width={52} height={52} sizes="52px" className="h-full w-full object-contain" /> : store.name.slice(0, 1).toLocaleUpperCase("az-AZ")}</span><span className="atelier-store-copy"><strong>{store.name}</strong><span>{marketplace("productCount", { count: store.productCount })}</span></span><ArrowUpRight size={18} aria-hidden="true" /></Link>)}</div></section> : null}

      <section className="atelier-discovery-banner"><picture><source media="(max-width: 639px)" srcSet={mobileImage} /><img src={heroImage} alt="Geyim, texnologiya və gündəlik aksesuarlar" width={2172} height={724} loading="lazy" /></picture><div><span className="atelier-eyebrow">Yeni seçimlər</span><h2>Gündəlik alışverişin.</h2><Link href="/products" className="atelier-primary-link">Kataloqa keç<ArrowRight size={17} aria-hidden="true" /></Link></div></section>
    </div>
    <SiteFooter siteName={siteSettings.shortName || siteSettings.siteName} logoUrl={siteSettings.logoUrl} darkLogoUrl={siteSettings.darkLogoUrl} socialLinks={{ instagram: siteSettings.socialLinks.instagram, tiktok: siteSettings.socialLinks.tiktok, whatsapp: siteSettings.socialLinks.whatsapp || siteSettings.whatsapp }} />
  </main>;
}
