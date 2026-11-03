import { getHomepageProductSections } from "@/lib/home/product-sections";
import { HomeExperience } from "@/components/home/home-experience";
import { getHomepageSections, getSiteSettings, getActiveHomeThemeSetting } from "@/lib/cms/data";
import { getMarketplaceProductPage, getMarketplaceStoreCards } from "@/lib/cart/data";
import { getCategoryOptions } from "@/lib/products/data";
import { getPopularMarketplaceSearches } from "@/lib/search/data";
import { getCurrentUserProfile } from "@/lib/auth/session";
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
  const [siteSettings, sections, activeTheme, stores, productPage, categories, popularSearches, currentUser] =
    await Promise.all([
      getSiteSettings(),
      getHomepageSections(),
      getActiveHomeThemeSetting(),
      getMarketplaceStoreCards({ limit: 16 }),
      getMarketplaceProductPage(locale, { limit: 24, filters: { inStock: true } }),
      getCategoryOptions(),
      getPopularMarketplaceSearches(),
      getCurrentUserProfile(),
    ]);

  return (
    <HomeExperience
      locale={locale}
      siteSettings={siteSettings}
      sections={sections}
      activeTheme={activeTheme.themeKey}
      themeConfig={activeTheme.config}
      stores={stores}
      productSections={getHomepageProductSections(productPage.products, categories)}
      categories={categories.filter((category) => !category.parentId)}
      popularSearches={popularSearches}
      title={t("title")}
      description={t("description")}
      productsLabel={common("products")}
      initialRole={currentUser?.role ?? null}
    />
  );
}
