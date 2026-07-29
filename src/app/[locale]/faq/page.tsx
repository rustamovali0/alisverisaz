import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { HelpFaqPage } from "@/components/help/help-content-pages";

type FaqPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Alışveriş.az istifadəçiləri üçün 100+ tez-tez verilən sual və cavab.",
  alternates: {
    canonical: "/faq",
  },
};

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HelpFaqPage />;
}
