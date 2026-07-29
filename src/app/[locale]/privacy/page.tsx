import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

type PrivacyPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Məxfilik Siyasəti",
  description:
    "Alışveriş.az platformasında məlumatların toplanması, qorunması və saxlanma qaydaları.",
  alternates: {
    canonical: "/privacy",
  },
};

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getHelpPage("privacy");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

