import { HomeExperience } from "@/components/home/home-experience";
import { getHomepageSections, getSiteSettings, getActiveHomeTheme } from "@/lib/cms/data";
import { getMarketplaceProducts } from "@/lib/cart/data";
import { getCategoryOptions } from "@/lib/products/data";
import { getTranslations, setRequestLocale } from "next-intl/server";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const [siteSettings, sections, activeTheme, products, categories] =
    await Promise.all([
      getSiteSettings(),
      getHomepageSections(),
      getActiveHomeTheme(),
      getMarketplaceProducts(locale),
      getCategoryOptions(),
    ]);

  return (
    <HomeExperience
      locale={locale}
      siteSettings={siteSettings}
      sections={sections}
      activeTheme={activeTheme}
      products={products}
      categories={categories}
      title={t("title")}
      description={t("description")}
      productsLabel={common("products")}
    />
  );
}
