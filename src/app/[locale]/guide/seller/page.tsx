import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

type SellerGuidePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Satıcı Təlimatı",
  description:
    "Alışveriş.az satıcıları üçün mağaza, məhsul, mesaj və sifariş idarəsi.",
  alternates: {
    canonical: "/guide/seller",
  },
};

export default async function SellerGuidePage({ params }: SellerGuidePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getHelpPage("guide/seller");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

