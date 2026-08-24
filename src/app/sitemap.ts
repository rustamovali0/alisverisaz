import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config/site";
import { getStorefrontUrl } from "@/lib/config/domains";
import { helpArticles, helpNavigation } from "@/lib/help-center/content";
import { createSupabasePublicClient } from "@/lib/supabase/public";

async function getStoreUrls(now: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createSupabasePublicClient();
    const { data } = await (supabase as any)
      .from("stores")
      .select("slug,updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1000);

    return ((data ?? []) as Array<{ slug: string | null; updated_at: string | null }>)
      .filter((store) => store.slug)
      .map((store) => ({
        url: getStorefrontUrl(store.slug as string),
        lastModified: store.updated_at ? new Date(store.updated_at) : now,
        changeFrequency: "daily" as const,
        priority: 0.75,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const storeUrls = await getStoreUrls(now);

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
    ...storeUrls,
  ];
}
