import { HomeExperience } from "@/components/home/home-experience";
import { getHomepageSections, getSiteSettings, getActiveHomeTheme } from "@/lib/cms/data";
import { getMarketplaceStores } from "@/lib/cart/data";
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
  const [siteSettings, sections, activeTheme, stores, categories] =
    await Promise.all([
      getSiteSettings(),
      getHomepageSections(),
      getActiveHomeTheme(),
      getMarketplaceStores({ locale, limit: 12 }),
      getCategoryOptions({ rootOnly: true }),
    ]);

  return (
    <HomeExperience
      locale={locale}
      siteSettings={siteSettings}
      sections={sections}
      activeTheme={activeTheme}
      stores={stores}
      categories={categories}
      title={t("title")}
      description={t("description")}
      productsLabel={common("products")}
    />
  );
}
