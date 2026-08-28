import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config/site";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const revalidate = 86_400;

const staticPaths = [
  "/",
  "/products",
  "/stores",
  "/categories",
  "/map",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
] as const;

function getBaseUrl() {
  return siteConfig.url.replace(/\/+$/, "");
}

function absoluteUrl(path: string) {
  const normalizedPath = path === "/" ? "" : path;

  return `${getBaseUrl()}${normalizedPath}`;
}

function readDate(value: string | null | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? fallback : date;
}

function readJoinedStore(value: unknown) {
  const store = Array.isArray(value) ? value[0] : value;

  if (!store || typeof store !== "object") {
    return null;
  }

  const row = store as { slug?: unknown; updated_at?: unknown };

  return typeof row.slug === "string" && row.slug
    ? {
        slug: row.slug,
        updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
      }
    : null;
}

async function getProductUrls(now: Date): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabasePublicClient();

  try {
    let { data, error } = await (supabase as any)
      .from("products")
      .select("slug,created_at,updated_at,stores!inner(slug,updated_at)")
      .eq("status", "active")
      .not("slug", "is", null)
      .limit(5000);

    if (error) {
      const fallback = await (supabase as any)
        .from("products")
        .select("slug,created_at,stores!inner(slug)")
        .eq("status", "active")
        .not("slug", "is", null)
        .limit(5000);

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return [];
    }

    return ((data ?? []) as Array<Record<string, unknown>>)
      .map((product) => {
        const store = readJoinedStore(product.stores);
        const slug = typeof product.slug === "string" ? product.slug : "";

        if (!slug || !store?.slug) {
          return null;
        }

        return {
          url: absoluteUrl(`/store/${store.slug}/products/${slug}`),
          lastModified: readDate(
            (product.updated_at as string | null | undefined) ?? store.updatedAt,
            readDate(product.created_at as string | null | undefined, now),
          ),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;
  } catch {
    return [];
  }
}

async function getStoreUrls(now: Date): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabasePublicClient();

  try {
    const { data, error } = await (supabase as any)
      .from("stores")
      .select("slug,updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(5000);

    if (error) {
      return [];
    }

    return ((data ?? []) as Array<{ slug: string | null; updated_at: string | null }>)
      .filter((store) => store.slug)
      .map((store) => ({
        url: absoluteUrl(`/store/${store.slug}`),
        lastModified: store.updated_at ? new Date(store.updated_at) : now,
        changeFrequency: "daily" as const,
        priority: 0.75,
      }));
  } catch {
    return [];
  }
}

async function getCategoryUrls(now: Date): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabasePublicClient();

  try {
    let { data, error } = await (supabase as any)
      .from("categories")
      .select("slug,updated_at")
      .eq("is_active", true)
      .not("slug", "is", null)
      .limit(1000);

    if (error) {
      const fallback = await (supabase as any)
        .from("categories")
        .select("slug")
        .eq("is_active", true)
        .not("slug", "is", null)
        .limit(1000);

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return [];
    }

    return ((data ?? []) as Array<{ slug: string | null; updated_at?: string | null }>)
      .filter((category) => category.slug)
      .map((category) => ({
        url: absoluteUrl(`/products?category=${encodeURIComponent(category.slug as string)}`),
        lastModified: readDate(category.updated_at, now),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [productUrls, storeUrls, categoryUrls] = await Promise.all([
    getProductUrls(now),
    getStoreUrls(now),
    getCategoryUrls(now),
  ]);

  return [
    ...staticPaths.map((path) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: (path === "/" || path === "/products" ? "daily" : "monthly") as const,
      priority: path === "/" ? 1 : path === "/products" ? 0.9 : 0.6,
    })),
    ...storeUrls,
    ...productUrls,
    ...categoryUrls,
  ];
}
