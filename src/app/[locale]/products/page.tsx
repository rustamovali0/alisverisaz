import type { Metadata } from "next";
import { ProductMarketplace } from "@/components/cart/product-marketplace";
import { getMarketplaceProductPage } from "@/lib/cart/data";
import { getActiveHomeThemeSetting, getSiteSettings } from "@/lib/cms/data";
import { getCategoryOptions } from "@/lib/products/data";
import { getTranslations, setRequestLocale } from "next-intl/server";

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    category?: string;
    q?: string;
    sort?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Yeni məhsullar",
    description:
      "Alışveriş marketplace-də mağazaların yeni məhsullarını kəşf edin. Online alışveriş, səbət və sifariş sistemi.",
    alternates: {
      canonical: "/products",
    },
    openGraph: {
      title: "Mağazalar və yeni məhsullar | Alışveriş",
      description:
        "Azərbaycanda online alışveriş üçün marketplace məhsulları və mağaza təklifləri.",
      url: "/products",
      type: "website",
    },
  };
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const common = await getTranslations("common");
  const [categories, siteSettings, activeTheme] = await Promise.all([
    getCategoryOptions({ rootOnly: true }),
    getSiteSettings(),
    getActiveHomeThemeSetting(),
  ]);
  const selectedCategory = categories.find(
    (category) => category.slug === search?.category || category.id === search?.category,
  );
  const productPage = await getMarketplaceProductPage(locale, {
    categoryId: selectedCategory?.id,
    searchQuery: search?.q,
    sort: search?.sort,
    limit: 52,
  });

  return (
    <ProductMarketplace
      products={productPage.products}
      nextCursor={productPage.nextCursor}
      hasMore={productPage.hasMore}
      categories={categories}
      selectedCategoryId={selectedCategory?.id}
      locale={locale}
      searchQuery={search?.q}
      sort={
        search?.sort === "oldest" || search?.sort === "price_asc" || search?.sort === "price_desc"
          ? search.sort
          : "newest"
      }
      productCardVariant={activeTheme.productCardVariant}
      footer={{
        siteName: siteSettings.shortName || siteSettings.siteName,
        logoUrl: siteSettings.logoUrl,
        darkLogoUrl: siteSettings.darkLogoUrl,
        description: siteSettings.defaultMetaDescription,
        socialLinks: {
          instagram: siteSettings.socialLinks.instagram,
          tiktok: siteSettings.socialLinks.tiktok,
          whatsapp: siteSettings.socialLinks.whatsapp || siteSettings.whatsapp,
        },
      }}
      labels={{
        title: t("title"),
        description: t("description"),
        emptyTitle: t("emptyTitle"),
        emptyDescription: t("emptyDescription"),
        stock: t("stock"),
        cart: common("cart"),
      }}
    />
  );
}
