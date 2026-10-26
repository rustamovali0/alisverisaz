"use client";
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
  return (
    <div className="live-section-heading">
      <div>
        <span className="live-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <Link href={href} className="live-text-link">
        {action}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function LiveStoreCard({ store }: { store: MarketplaceStore }) {
  return (
    <article className="live-store-card">
      <Link
        href={getStorePath(store.slug)}
        className="live-store-cover"
        aria-label={`${store.name} mağazasına bax`}
      >
        {store.coverUrl && (
          <OptimizedImage
            src={store.coverUrl}
            alt=""
            fill
            sizes="320px"
            className="object-cover opacity-35"
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
        <p>{store.description || "Seçilmiş məhsulların ünvanı"}</p>
        <div>
          <span>
            <Package size={13} />
            {store.productCount} məhsul
          </span>
          <Link
            href={getStorePath(store.slug)}
            aria-label={`${store.name} vitrininə keç`}
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
              alt="ALISVERIS.AZ yeni məhsul və mağaza kəşfləri"
              fetchPriority="high"
            />
            <div className="live-hero-copy">
              <span className="live-hero-label">
                <i />
                YENİ KƏŞFLƏR. SİZƏ ÖZƏL SEÇİMLƏR.
              </span>
              <h1>
                {slide === 0 ? (
                  isDefaultTitle ? (
                    <>
                      Hər ehtiyacına
                      <br />
                      bir <em>tapıntı.</em>
                    </>
                  ) : (
                    hero.title
                  )
                ) : slide === 1 ? (
                  <>
                    Sevdiyin stil.
                    <br />
                    Sənin <em>seçimin.</em>
                  </>
                ) : (
                  <>
                    Evinə yeni
                    <br />
                    bir <em>nəfəs.</em>
                  </>
                )}
              </h1>
              <p>
                {slide === 0 && hero?.description && !isDefaultTitle ? (
                  hero.description
                ) : (
                  <>
                    Sevdiyin məhsullar, etibarlı mağazalar.
                    <br />
                    Hamısı bir ünvanda — alışveriş.az-da.
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
                  ? hero.buttonLabel
                  : "İndi kəşf et"}
                <ArrowRight size={17} />
              </Link>
              <div className="live-hero-dots" aria-label="Kampaniya slaydları">
                {[0, 1, 2].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSlide(n)}
                    className={slide === n ? "active" : ""}
                    aria-label={`${n + 1}-ci slayd`}
                    aria-pressed={slide === n}
                  />
                ))}
              </div>
            </div>
            <span className="live-hero-sticker">
              <ShieldCheck size={22} />
              <span>
                Əminliklə seç.<strong>Sevərək istifadə et.</strong>
              </span>
            </span>
          </section>
          <section className="live-side-offer">
            <span className="live-eyebrow">
              {offer?.discountAmount ? "SƏRFƏLİ TAPINTI" : "YENİ MƏHSULLAR"}
            </span>
            <h2>
              {offer?.discountAmount ? (
                <>
                  Yaxşı seçim.
                  <br />
                  Daha yaxşı qiymət.
                </>
              ) : (
                <>
                  Axtardığınız
                  <br />
                  burada ola bilər.
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
              <p>Mağazaların yeni məhsulları ilə tanış olun.</p>
            )}
            <Link
              className="live-circle-arrow"
              href={offerHref}
              aria-label="Məhsula bax"
            >
              <ArrowUpRight size={22} />
            </Link>
          </section>
        </div>
        <div className="live-benefits">
          {[
            {
              Icon: Truck,
              title: "Mağazadan çatdırılma",
              text: "Şərtlər məhsul səhifəsində",
              href: "/help",
            },
            {
              Icon: ShieldCheck,
              title: "Etibarlı alış-veriş",
              text: "Mağazalarla birbaşa əlaqə",
              href: "/stores",
            },
            {
              Icon: MessageCircle,
              title: "Satıcıya sual verin",
              text: "Məhsul üzrə mesajlaşma",
              href: "/products",
            },
            {
              Icon: Headphones,
              title: "Hər zaman yanınızda",
              text: "Yardım və dəstək mərkəzi",
              href: "/help",
            },
          ].map(({ Icon, title, text, href }) => (
            <Link key={title} href={href}>
              <Icon size={25} />
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </Link>
          ))}
        </div>
        {activeCategories.length > 0 && (
          <section className="live-section live-category-section">
            <SectionHeading
              eyebrow="SƏNİN DÜNYAN, SƏNİN SEÇİMİN"
              title={categorySection?.title || "Nə axtarırsınız?"}
              href="/categories"
              action="Bütün kateqoriyalar"
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
                    <strong>{c.name}</strong>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        <section className="live-section">
          <SectionHeading
            eyebrow="SEÇİLMİŞ MƏHSULLAR"
            title="Bəyənəcəyinizi düşündük"
          />
          <div className="live-section-tabs">
            <Link href="/products" className="active">
              Sizin üçün
            </Link>
            {activeCategories.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${encodeURIComponent(c.slug)}`}
              >
                {c.name}
              </Link>
            ))}
            <span>
              <Crown size={14} />
              Mağazalardan yeni tapıntılar
            </span>
          </div>
          <div className="live-home-products">
            <ProductGrid
              products={featuredProducts}
              labels={{ stock: "Stok" }}
              compactMobileCards
            />
          </div>
        </section>
        <section className="live-promo-banners">
          <Link href="/products?q=ev" className="live-interior-promo">
            <img
              src="/marketplace/images/interior.jpg"
              alt="Müasir və rahat ev interyeri"
              loading="lazy"
            />
            <div>
              <span className="live-eyebrow">EVİNİZƏ YARAŞAN SEÇİMLƏR</span>
              <h2>
                Rahatlıq kiçik
                <br />
                detallardan başlayır.
              </h2>
              <span className="live-btn live-btn-white">
                Evin üçün kəşf et
                <ArrowRight size={16} />
              </span>
            </div>
          </Link>
          <Link href="/products?q=geyim" className="live-style-promo">
            <span className="live-eyebrow">ÖZ STİLİNİ TAP</span>
            <h2>
              Hər addımda
              <br />
              sənə özəl.
            </h2>
            <p>Sevdiyiniz seçimləri bir arada tapın.</p>
            <span className="live-text-link">
              Kolleksiyaya bax
              <ArrowRight size={16} />
            </span>
            <Leaf size={145} strokeWidth={0.55} />
          </Link>
        </section>
        {featuredStores.length > 0 && (
          <section className="live-section">
            <SectionHeading
              eyebrow="YAXŞI SEÇİMLƏRİN ÜNVANI"
              title={featuredSection?.title || "Seçilmiş mağazalar"}
              href="/stores"
              action="Bütün mağazalar"
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
            eyebrow="YENİ GƏLƏNLƏR"
            title="Kəşf etməyə davam edin"
          />
          <InfiniteProductGrid
            initialProducts={products}
            initialCursor={productNextCursor}
            initialHasMore={productHasMore}
            locale={locale}
            sort="newest"
            labels={{ stock: "Stok" }}
            compactMobileCards
          />
        </section>
        {(initialRole == null || initialRole === "seller") && (
          <section className="live-seller-banner">
            <Store size={54} strokeWidth={1.2} />
            <div>
              <span className="live-eyebrow">BİRLİKDƏ BÖYÜYƏK</span>
              <h2>Mağazanızın növbəti ünvanı buradır.</h2>
              <p>Məhsullarınızı yeni alıcılarla tanış edin.</p>
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
                ? "Mağazanı idarə et"
                : "Satışa başlayın"}
              <ArrowUpRight size={17} />
            </Link>
          </section>
        )}
      </div>
      <SiteFooter {...footerProps} />
    </main>
  );
}
