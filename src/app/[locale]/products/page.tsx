import type { Metadata } from "next";
import { ProductMarketplace } from "@/components/cart/product-marketplace";
import { getMarketplaceStores } from "@/lib/cart/data";
import { getSiteSettings } from "@/lib/cms/data";
import { getCategoryOptions } from "@/lib/products/data";
import { getTranslations, setRequestLocale } from "next-intl/server";

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    category?: string;
    q?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Yeni məhsullar",
    description:
      "alisveris.az marketplace-də mağazaların yeni məhsullarını kəşf edin. Online alışveriş, səbət və sifariş sistemi.",
    alternates: {
      canonical: "/products",
    },
    openGraph: {
      title: "Mağazalar və yeni məhsullar | alisveris.az",
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
  const [categories, siteSettings] = await Promise.all([
    getCategoryOptions({ rootOnly: true }),
    getSiteSettings(),
  ]);
  const selectedCategory = categories.find(
    (category) => category.slug === search?.category || category.id === search?.category,
  );
  const stores = await getMarketplaceStores({
    locale,
    categoryId: selectedCategory?.id,
    searchQuery: search?.q,
  });

  return (
    <ProductMarketplace
      stores={stores}
      categories={categories}
      selectedCategoryId={selectedCategory?.id}
      searchQuery={search?.q}
      footer={{
        siteName: siteSettings.shortName || siteSettings.siteName,
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
