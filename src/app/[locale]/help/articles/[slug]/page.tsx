import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { HelpArticlePage } from "@/components/help/help-content-pages";
import {
  getHelpArticle,
  getHelpArticleStaticParams,
} from "@/lib/help-center/content";

type HelpArticleRouteProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getHelpArticleStaticParams().map((item) => ({
    slug: item.slug.join("/"),
  }));
}

export async function generateMetadata({
  params,
}: HelpArticleRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticle(slug);

  if (!article) {
    return {};
  }

  return {
    title: article.title,
    description: article.summary,
    alternates: {
      canonical: article.href,
    },
  };
}

export default async function HelpArticleRoute({ params }: HelpArticleRouteProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = getHelpArticle(slug);

  if (!article) {
    notFound();
  }

  return <HelpArticlePage article={article} />;
}

