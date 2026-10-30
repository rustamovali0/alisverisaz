import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { HelpCenter } from "@/components/help/help-center";
import { helpQuickLinks, helpTopicLinks } from "@/lib/help-center/landing-data";
import { getSiteSettings } from "@/lib/cms/data";

type HelpPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Kömək Mərkəzi",
  description:
    "Alışveriş.az üçün istifadəçi razılaşması, FAQ, təlimatlar və dəstək məzmunları.",
  alternates: {
    canonical: "/help",
  },
};

export default async function HelpPage({ params }: HelpPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSiteSettings();
  return (
    <HelpCenter
      locale={locale}
      topics={helpTopicLinks}
      quickLinks={helpQuickLinks}
      supportPhone={settings.phone || settings.whatsapp}
      year={new Date().getFullYear()}
    />
  );
}
