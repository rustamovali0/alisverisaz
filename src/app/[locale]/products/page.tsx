import type { Metadata } from "next";
import { ProductMarketplace } from "@/components/cart/product-marketplace";
import { getMarketplaceProducts } from "@/lib/cart/data";
import { getDepositSettings } from "@/lib/settings/data";
import { getTranslations, setRequestLocale } from "next-intl/server";

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Məhsullar və elanlar",
    description:
      "alisveris.az marketplace-də aktiv məhsulları, elanları və mağaza təkliflərini kəşf edin. Online alışveriş, səbət və sifariş sistemi.",
    alternates: {
      canonical: "/az/products",
    },
    openGraph: {
      title: "Məhsullar və elanlar | alisveris.az",
      description:
        "Azərbaycanda online alışveriş üçün marketplace məhsulları və mağaza təklifləri.",
      url: "/az/products",
      type: "website",
    },
  };
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const common = await getTranslations("common");
  const [products, depositSettings] = await Promise.all([
    getMarketplaceProducts(locale),
    getDepositSettings(),
  ]);

  return (
    <ProductMarketplace
      products={products}
      depositEnabled={depositSettings.enabled}
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
