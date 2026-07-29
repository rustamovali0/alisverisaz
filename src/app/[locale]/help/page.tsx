import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

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
  const page = getHelpPage("help");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

