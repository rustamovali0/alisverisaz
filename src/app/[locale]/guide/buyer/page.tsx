import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

type BuyerGuidePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Alıcı Təlimatı",
  description:
    "Alışveriş.az-da məhsul tapmaq, satıcı ilə yazışmaq və sifariş vermək üçün bələdçi.",
  alternates: {
    canonical: "/guide/buyer",
  },
};

export default async function BuyerGuidePage({ params }: BuyerGuidePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getHelpPage("guide/buyer");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

