import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { HelpArticlesIndexPage } from "@/components/help/help-content-pages";

type HelpArticlesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Kömək məqalələri",
  description:
    "Alışveriş.az istifadəçiləri üçün 100+ addım-addım yardım məqaləsi.",
  alternates: {
    canonical: "/help/articles",
  },
};

export default async function HelpArticlesPage({ params }: HelpArticlesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HelpArticlesIndexPage />;
}
