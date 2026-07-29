import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

type NewListingGuidePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Yeni Elan Təlimatı",
  description: "Alışveriş.az-da yeni məhsul və elan yerləşdirmək üçün təlimat.",
  alternates: {
    canonical: "/guide/new-listing",
  },
};

export default async function NewListingGuidePage({
  params,
}: NewListingGuidePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getHelpPage("guide/new-listing");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

