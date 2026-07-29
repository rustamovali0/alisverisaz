import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

type TermsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "İstifadəçi Razılaşması",
  description: "Alışveriş.az istifadə qaydaları və tərəflərin öhdəlikləri.",
  alternates: {
    canonical: "/terms",
  },
};

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getHelpPage("terms");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

