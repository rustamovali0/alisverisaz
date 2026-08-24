import { HomeExperience } from "@/components/home/home-experience";
import { getHomepageSections, getSiteSettings, getActiveHomeThemeSetting } from "@/lib/cms/data";
import { getMarketplaceProductPage, getMarketplaceStores } from "@/lib/cart/data";
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
  const [siteSettings, sections, activeTheme, stores, productPage, categories] =
    await Promise.all([
      getSiteSettings(),
      getHomepageSections(),
      getActiveHomeThemeSetting(),
      getMarketplaceStores({ locale, limit: 120 }),
      getMarketplaceProductPage(locale, { limit: 20 }),
      getCategoryOptions({ rootOnly: true }),
    ]);

  return (
    <HomeExperience
      locale={locale}
      siteSettings={siteSettings}
      sections={sections}
      activeTheme={activeTheme.themeKey}
      themeConfig={activeTheme.config}
      stores={stores}
      products={productPage.products}
      productNextCursor={productPage.nextCursor}
      productHasMore={productPage.hasMore}
      categories={categories}
      title={t("title")}
      description={t("description")}
      productsLabel={common("products")}
    />
  );
}
