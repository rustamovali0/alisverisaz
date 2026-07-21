import { HomeExperience } from "@/components/home/home-experience";
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

  return (
    <HomeExperience
      title={t("title")}
      description={t("description")}
      productsLabel={common("products")}
    />
  );
}
