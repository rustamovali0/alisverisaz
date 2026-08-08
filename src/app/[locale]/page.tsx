import { HomeExperience } from "@/components/home/home-experience";
import { getHomepageSections, getSiteSettings, getActiveHomeTheme } from "@/lib/cms/data";
import { getMarketplaceProducts, getMarketplaceStores } from "@/lib/cart/data";
import { getCategoryOptions } from "@/lib/products/data";
import { getDepositSettings } from "@/lib/settings/data";
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
  const [siteSettings, sections, activeTheme, stores, products, categories, depositSettings] =
    await Promise.all([
      getSiteSettings(),
      getHomepageSections(),
      getActiveHomeTheme(),
      getMarketplaceStores({ locale, limit: 120 }),
      getMarketplaceProducts(locale),
      getCategoryOptions({ rootOnly: true }),
      getDepositSettings(),
    ]);

  return (
    <HomeExperience
      locale={locale}
      siteSettings={siteSettings}
      sections={sections}
      activeTheme={activeTheme}
      stores={stores}
      products={products}
      depositEnabled={depositSettings.enabled}
      categories={categories}
      title={t("title")}
      description={t("description")}
      productsLabel={common("products")}
    />
  );
}
