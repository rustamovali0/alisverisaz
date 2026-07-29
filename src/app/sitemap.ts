import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config/site";
import { helpArticles, helpNavigation } from "@/lib/help-center/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const helpUrls = helpNavigation.map((item) => ({
    url: `${siteConfig.url}${item.href}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: item.href === "/help" ? 0.7 : 0.5,
  }));
  const articleUrls = helpArticles.map((article) => ({
    url: `${siteConfig.url}${article.href}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.35,
  }));

  return [
    {
      url: siteConfig.url,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...helpUrls,
    ...articleUrls,
  ];
}
