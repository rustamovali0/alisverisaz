import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

type RulesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Marketplace Qaydaları",
  description:
    "Alışveriş.az elan, məhsul, mesaj və istifadəçi davranışı qaydaları.",
  alternates: {
    canonical: "/rules",
  },
};

export default async function RulesPage({ params }: RulesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getHelpPage("rules");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

