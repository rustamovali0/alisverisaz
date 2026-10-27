"use client";
import { useMarketplaceText } from "@/i18n/marketplace-copy";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Crown,
  Headphones,
  Leaf,
  MessageCircle,
  Package,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import {
  ProductGrid,
  InfiniteProductGrid,
} from "@/components/cart/product-marketplace";
import { getCategoryImage } from "@/lib/categories/images";
import { getCategoryIcon } from "@/components/categories/category-icons";
import { OptimizedImage } from "@/components/common/optimized-image";
import { SiteFooter } from "@/components/layout/site-footer";
import { Link } from "@/i18n/navigation";
import { getStorePath } from "@/lib/config/domains";
import { formatAznDiscountedPrice, formatAznPrice } from "@/lib/format";
import type { CartProduct, MarketplaceStore } from "@/lib/cart/types";
import type { HomepageSection, SiteSettings } from "@/lib/cms/types";
import type { CategoryOption } from "@/lib/products/types";
import type { AuthRole } from "@/lib/auth/types";
type HomeExperienceProps = {
  locale: string;
  siteSettings: SiteSettings;
  sections: HomepageSection[];
  activeTheme: string;
  themeConfig?: Record<string, unknown>;
  stores: MarketplaceStore[];
  products: CartProduct[];
  productNextCursor?: string | null;
  productHasMore?: boolean;
  categories: CategoryOption[];
  popularSearches?: string[];
  title: string;
  description: string;
  productsLabel: string;
  initialRole?: AuthRole | null;
};
function SectionHeading({
  eyebrow,
  title,
  href = "/products",
  action = "Hamısına bax",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  action?: string;
}) {
  const text = useMarketplaceText();
  return (
    <div className="live-section-heading">
      <div>
        <span className="live-eyebrow">{text(eyebrow)}</span>
        <h2>{text(title)}</h2>
      </div>
      <Link href={href} className="live-text-link">
        {text(action)}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function LiveStoreCard({ store }: { store: MarketplaceStore }) {
  const text = useMarketplaceText();
  return (
    <article className="live-store-card">
      <Link
        href={getStorePath(store.slug)}
        className="live-store-cover"
        aria-label={text("{name} mağazasına bax", { name: store.name })}
      >
        {store.coverUrl && (
          <OptimizedImage
            src={store.coverUrl}
            alt=""
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 320px"
            placeholder="empty"
            className="object-cover"
          />
        )}
        <span className="live-store-logo">
          {store.logoUrl ? (
            <img src={store.logoUrl} alt="" loading="lazy" />
          ) : (
            store.name.slice(0, 2)
          )}
        </span>
        {store.isPromoted && (
          <span className="live-vip-badge">
            <Crown size={11} />
            VIP
          </span>
        )}
      </Link>
      <div className="live-store-body">
        <Link href={getStorePath(store.slug)}>
          <h3>
            {store.name}
            <ShieldCheck size={15} />
          </h3>
        </Link>
        <p>{store.description || text("Seçilmiş məhsulların ünvanı")}</p>
        <div>
          <span>
            <Package size={13} />
            {text("{count} məhsul", { count: store.productCount })}
          </span>
          <Link
            href={getStorePath(store.slug)}
            aria-label={text("{name} vitrininə keç", { name: store.name })}
          >
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function HomeExperience({
  locale,
  siteSettings,
  sections,
  stores,
  products,
  productNextCursor,
  productHasMore,
  categories,
  initialRole,
}: HomeExperienceProps) {
  const text = useMarketplaceText();
  const [slide, setSlide] = useState(0);
  const hero = sections.find((s) => s.key === "hero");
  const categorySection = sections.find((s) => s.key === "categories");
  const featuredSection = sections.find((s) => s.key === "featured_products");
  const selectedIds = Array.isArray(featuredSection?.settings.storeIds)
    ? (featuredSection.settings.storeIds as string[])
    : [];
  const featuredStores = [...stores]
    .filter(
      (s) =>
        s.productCount > 0 &&
        (!selectedIds.length || selectedIds.includes(s.id)),
    )
    .sort((a, b) => Number(!!b.isPromoted) - Number(!!a.isPromoted))
    .slice(0, featuredSection?.itemLimit || 4);
  const activeCategories = categories.slice(
    0,
    Math.min(categorySection?.itemLimit || 8, 16),
  );
  const featuredProducts = [...products]
    .sort((a, b) => Number(!!b.isPromoted) - Number(!!a.isPromoted))
    .slice(0, 5);
  const offer = products.find((p) => p.discountAmount > 0) || products[0];
  const offerHref = offer?.storeSlug
    ? `${getStorePath(offer.storeSlug)}/products/${offer.slug}`
    : "/products";
  const isDefaultTitle =
    !hero?.title ||
    /Alışverişdə hər mağaza|Alışverişin ünvanı|^alisveris.az$/i.test(
      hero.title,
    );
  const heroCustomImage =
    hero?.imageUrl && !hero.imageUrl.includes("/auth/")
      ? hero.imageUrl
      : undefined;
  const heroImage =
    slide === 0
      ? heroCustomImage || "/marketplace/images/hero.jpg"
      : slide === 1
        ? "/marketplace/images/fashion.jpg"
        : "/marketplace/images/interior.jpg";
  const footerProps = {
    siteName: siteSettings.shortName || siteSettings.siteName,
    logoUrl: siteSettings.logoUrl,
    darkLogoUrl: siteSettings.darkLogoUrl,
    description: siteSettings.defaultMetaDescription,
    socialLinks: {
      instagram: siteSettings.socialLinks.instagram,
      tiktok: siteSettings.socialLinks.tiktok,
      whatsapp: siteSettings.socialLinks.whatsapp || siteSettings.whatsapp,
    },
  };
  return (
    <main className="live-home">
      <div className="live-wrap">
        <div className="live-hero-grid">
          <section className="live-hero">
            <img
              src={heroImage}
              alt={text("ALISVERIS.AZ yeni məhsul və mağaza kəşfləri")}
              fetchPriority="high"
            />
            <div className="live-hero-copy">
              <span className="live-hero-label">
                <i />
                {text("YENİ KƏŞFLƏR. SİZƏ ÖZƏL SEÇİMLƏR.")}
              </span>
              <h1>
                {slide === 0 ? (
                  isDefaultTitle ? (
                    <>
                      {text("Hər ehtiyacına")}
                      <br />
                      {text("bir")} <em>{text("tapıntı.")}</em>
                    </>
                  ) : (
                    text(hero.title)
                  )
                ) : slide === 1 ? (
                  <>
                    {text("Sevdiyin stil.")}
                    <br />
                    {text("Sənin")} <em>{text("seçimin.")}</em>
                  </>
                ) : (
                  <>
                    {text("Evinə yeni")}
                    <br />
                    {text("bir")} <em>{text("nəfəs.")}</em>
                  </>
                )}
              </h1>
              <p>
                {slide === 0 && hero?.description && !isDefaultTitle ? (
                  text(hero.description)
                ) : (
                  <>
                    {text("Sevdiyin məhsullar, etibarlı mağazalar.")}
                    <br />
                    {text("Hamısı bir ünvanda — alışveriş.az-da.")}
                  </>
                )}
              </p>
              <Link
                className="live-btn"
                href={
                  hero?.buttonUrl && slide === 0
                    ? hero.buttonUrl
                    : slide === 1
                      ? "/products?q=geyim"
                      : slide === 2
                        ? "/products?q=ev"
                        : "/products"
                }
              >
                {hero?.buttonLabel && slide === 0
                  ? text(hero.buttonLabel)
                  : text("İndi kəşf et")}
                <ArrowRight size={17} />
              </Link>
              <div
                className="live-hero-dots"
                aria-label={text("Kampaniya slaydları")}
              >
                {[0, 1, 2].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSlide(n)}
                    className={slide === n ? "active" : ""}
                    aria-label={text("{number}-ci slayd", { number: n + 1 })}
                    aria-pressed={slide === n}
                  />
                ))}
              </div>
            </div>
            <span className="live-hero-sticker">
              <ShieldCheck size={22} />
              <span>
                {text("Əminliklə seç.")}
                <strong>{text("Sevərək istifadə et.")}</strong>
              </span>
            </span>
          </section>
          <section className="live-side-offer">
            <span className="live-eyebrow">
              {offer?.discountAmount
                ? text("SƏRFƏLİ TAPINTI")
                : text("YENİ MƏHSULLAR")}
            </span>
            <h2>
              {offer?.discountAmount ? (
                <>
                  {text("Yaxşı seçim.")}
                  <br />
                  {text("Daha yaxşı qiymət.")}
                </>
              ) : (
                <>
                  {text("Axtardığınız")}
                  <br />
                  {text("burada ola bilər.")}
                </>
              )}
            </h2>
            {offer ? (
              <>
                <p>{offer.name}</p>
                <strong>
                  {formatAznDiscountedPrice(
                    offer.priceAmount,
                    offer.discountAmount,
                  )}
                </strong>
                {offer.discountAmount > 0 && (
                  <del>{formatAznPrice(offer.priceAmount)}</del>
                )}
                {offer.imageUrl && (
                  <OptimizedImage
                    src={offer.imageUrl}
                    alt={offer.name}
                    width={230}
                    height={200}
                    className="live-offer-image"
                  />
                )}
              </>
            ) : (
              <p>{text("Mağazaların yeni məhsulları ilə tanış olun.")}</p>
            )}
            <Link
              className="live-circle-arrow"
              href={offerHref}
              aria-label={text("Məhsula bax")}
            >
              <ArrowUpRight size={22} />
            </Link>
          </section>
        </div>
        <div className="live-benefits">
          {[
            {
              Icon: Truck,
              title: text("Mağazadan çatdırılma"),
              text: text("Şərtlər məhsul səhifəsində"),
              href: "/help",
            },
            {
              Icon: ShieldCheck,
              title: text("Etibarlı alış-veriş"),
              text: text("Mağazalarla birbaşa əlaqə"),
              href: "/stores",
            },
            {
              Icon: MessageCircle,
              title: text("Satıcıya sual verin"),
              text: text("Məhsul üzrə mesajlaşma"),
              href: "/products",
            },
            {
              Icon: Headphones,
              title: text("Hər zaman yanınızda"),
              text: text("Yardım və dəstək mərkəzi"),
              href: "/help",
            },
          ].map(({ Icon, title, text: detail, href }) => (
            <Link key={text(title)} href={href}>
              <Icon size={25} />
              <span>
                <strong>{text(title)}</strong>
                <small>{detail}</small>
              </span>
            </Link>
          ))}
        </div>
        {activeCategories.length > 0 && (
          <section className="live-section live-category-section">
            <SectionHeading
              eyebrow={text("SƏNİN DÜNYAN, SƏNİN SEÇİMİN")}
              title={categorySection?.title || text("Nə axtarırsınız?")}
              href="/categories"
              action={text("Bütün kateqoriyalar")}
            />
            <div className="live-categories">
              {activeCategories.map((c, i) => {
                const Icon = getCategoryIcon(c);
                return (
                  <Link
                    key={c.id}
                    href={`/products?category=${encodeURIComponent(c.slug)}`}
                  >
                    <span
                      className={`live-category-art live-category-tone-${i % 8}`}
                    >
                      {getCategoryImage(c) ? (
                        <img
                          src={getCategoryImage(c)!}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <Icon strokeWidth={1.2} size={45} />
                      )}
                    </span>
                    <strong>{text(c.name)}</strong>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        <section className="live-section">
          <SectionHeading
            eyebrow={text("SEÇİLMİŞ MƏHSULLAR")}
            title={text("Bəyənəcəyinizi düşündük")}
          />
          <div className="live-section-tabs">
            <Link href="/products" className="active">
              {text("Sizin üçün")}
            </Link>
            {activeCategories.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${encodeURIComponent(c.slug)}`}
              >
                {text(c.name)}
              </Link>
            ))}
            <span>
              <Crown size={14} />
              {text("Mağazalardan yeni tapıntılar")}
            </span>
          </div>
          <div className="live-home-products">
            <ProductGrid
              products={featuredProducts}
              labels={{ stock: text("Stok") }}
              compactMobileCards
            />
          </div>
        </section>
        <section className="live-promo-banners">
          <Link href="/products?q=ev" className="live-interior-promo">
            <img
              src="/marketplace/images/interior.jpg"
              alt={text("Müasir və rahat ev interyeri")}
              loading="lazy"
            />
            <div>
              <span className="live-eyebrow">
                {text("EVİNİZƏ YARAŞAN SEÇİMLƏR")}
              </span>
              <h2>
                {text("Rahatlıq kiçik")}
                <br />
                {text("detallardan başlayır.")}
              </h2>
              <span className="live-btn live-btn-white">
                {text("Evin üçün kəşf et")}
                <ArrowRight size={16} />
              </span>
            </div>
          </Link>
          <Link href="/products?q=geyim" className="live-style-promo">
            <span className="live-eyebrow">{text("ÖZ STİLİNİ TAP")}</span>
            <h2>
              {text("Hər addımda")}
              <br />
              {text("sənə özəl.")}
            </h2>
            <p>{text("Sevdiyiniz seçimləri bir arada tapın.")}</p>
            <span className="live-text-link">
              {text("Kolleksiyaya bax")}
              <ArrowRight size={16} />
            </span>
            <Leaf size={145} strokeWidth={0.55} />
          </Link>
        </section>
        {featuredStores.length > 0 && (
          <section className="live-section">
            <SectionHeading
              eyebrow={text("YAXŞI SEÇİMLƏRİN ÜNVANI")}
              title={featuredSection?.title || text("Seçilmiş mağazalar")}
              href="/stores"
              action={text("Bütün mağazalar")}
            />
            <div className="live-store-grid">
              {featuredStores.map((s) => (
                <LiveStoreCard key={s.id} store={s} />
              ))}
            </div>
          </section>
        )}
        <section className="live-section">
          <SectionHeading
            eyebrow={text("YENİ GƏLƏNLƏR")}
            title={text("Kəşf etməyə davam edin")}
          />
          <InfiniteProductGrid
            initialProducts={products}
            initialCursor={productNextCursor}
            initialHasMore={productHasMore}
            locale={locale}
            sort="newest"
            labels={{ stock: text("Stok") }}
            compactMobileCards
          />
        </section>
        {(initialRole == null || initialRole === "seller") && (
          <section className="live-seller-banner">
            <Store size={54} strokeWidth={1.2} />
            <div>
              <span className="live-eyebrow">{text("BİRLİKDƏ BÖYÜYƏK")}</span>
              <h2>{text("Mağazanızın növbəti ünvanı buradır.")}</h2>
              <p>{text("Məhsullarınızı yeni alıcılarla tanış edin.")}</p>
            </div>
            <Link
              href={
                initialRole === "seller"
                  ? "/store/dashboard"
                  : "/register?role=seller"
              }
              className="live-btn"
            >
              {initialRole === "seller"
                ? text("Mağazanı idarə et")
                : text("Satışa başlayın")}
              <ArrowUpRight size={17} />
            </Link>
          </section>
        )}
      </div>
      <SiteFooter {...footerProps} />
    </main>
  );
}
