import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpDocumentPage } from "@/components/help/help-content-pages";
import { getHelpPage } from "@/lib/help-center/content";

type ContactPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Əlaqə və Dəstək",
  description:
    "Alışveriş.az texniki dəstək, şikayət və platforma ilə əlaqə səhifəsi.",
  alternates: {
    canonical: "/contact",
  },
};

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getHelpPage("contact");

  if (!page) {
    notFound();
  }

  return <HelpDocumentPage page={page} />;
}

