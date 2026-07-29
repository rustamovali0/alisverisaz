import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

type AboutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Layihə haqqında",
  description: "Alışveriş.az marketplace platformasının məqsədi və iş modeli.",
  alternates: {
    canonical: "/about",
  },
};

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getHelpPage("about");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

