import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

export const CACHE_TTL = {
  SHORT: 30,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86_400,
} as const;

const SUPPORTED_CACHE_LOCALES = ["az", "en", "ru"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CacheLocale = (typeof SUPPORTED_CACHE_LOCALES)[number];

function safeId(value: string | null | undefined) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function safeSlug(value: string | null | undefined) {
  const nextValue = value?.trim().toLowerCase() ?? "";

  return /^[a-z0-9-]{1,120}$/.test(nextValue) ? nextValue : null;
}

function revalidateLocalizedPath(path: string) {
  for (const locale of SUPPORTED_CACHE_LOCALES) {
    revalidatePath(`/${locale}${path === "/" ? "" : path}`);
  }
}

function revalidateSeoRoutes() {
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
}

export function normalizeCacheLocale(locale: string | null | undefined): CacheLocale {
  return SUPPORTED_CACHE_LOCALES.includes(locale as CacheLocale)
    ? (locale as CacheLocale)
    : "az";
}

export const CACHE_TAGS = {
  publicSiteSettings: "public-site-settings",
  homepage: "homepage",
  themeSettings: "theme-settings",
  navigationMenus: "navigation-menus",
  categories: "categories",
  category: (categoryId: string) => `category:${categoryId}`,
  products: "products",
  product: (productId: string) => `product:${productId}`,
  marketplaceStores: "marketplace-stores",
  store: (storeId: string) => `store:${storeId}`,
  storeProducts: (storeId: string) => `store-products:${storeId}`,
  faq: "faq",
  helpCenter: "help-center",
  articles: "articles",
  article: (articleId: string) => `article:${articleId}`,
} as const;

export function publicCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  options: {
    revalidate: number;
    tags: string[];
  },
) {
  const safeKeyParts = keyParts.map((part) => {
    const normalized = part.toLowerCase().replace(/[^a-z0-9:_-]/g, "-").slice(0, 160);

    return normalized || "value";
  });

  return unstable_cache(fn, safeKeyParts, options);
}

export function invalidatePublicSiteSettings() {
  revalidateTag(CACHE_TAGS.publicSiteSettings, "max");
  revalidateTag(CACHE_TAGS.homepage, "max");
  revalidateLocalizedPath("/");
  revalidateSeoRoutes();
}

export function invalidateHomepagePublicData() {
  revalidateTag(CACHE_TAGS.homepage, "max");
  revalidateLocalizedPath("/");
  revalidateSeoRoutes();
}

export function invalidateNavigationPublicData() {
  revalidateTag(CACHE_TAGS.navigationMenus, "max");
  revalidateLocalizedPath("/");
  revalidateSeoRoutes();
}

export function invalidateCategoryPublicData(input: {
  categoryId?: string | null;
}) {
  const categoryId = safeId(input.categoryId);

  revalidateTag(CACHE_TAGS.categories, "max");
  revalidateTag(CACHE_TAGS.products, "max");
  revalidateTag(CACHE_TAGS.homepage, "max");

  if (categoryId) {
    revalidateTag(CACHE_TAGS.category(categoryId), "max");
  }

  revalidateLocalizedPath("/");
  revalidateLocalizedPath("/products");
  revalidateSeoRoutes();
}

export function invalidateProductPublicData(input: {
  productId?: string | null;
  storeId?: string | null;
  categoryId?: string | null;
  storeSlug?: string | null;
  homepage?: boolean;
}) {
  const productId = safeId(input.productId);
  const storeId = safeId(input.storeId);
  const categoryId = safeId(input.categoryId);
  const storeSlug = safeSlug(input.storeSlug);

  revalidateTag(CACHE_TAGS.products, "max");

  if (productId) {
    revalidateTag(CACHE_TAGS.product(productId), "max");
  }

  if (storeId) {
    revalidateTag(CACHE_TAGS.store(storeId), "max");
    revalidateTag(CACHE_TAGS.storeProducts(storeId), "max");
  }

  if (categoryId) {
    revalidateTag(CACHE_TAGS.category(categoryId), "max");
  }

  if (input.homepage) {
    revalidateTag(CACHE_TAGS.homepage, "max");
    revalidateLocalizedPath("/");
  }

  revalidateLocalizedPath("/products");

  if (storeSlug) {
    revalidateLocalizedPath(`/${storeSlug}`);
    revalidateLocalizedPath(`/store/${storeSlug}`);
  }

  revalidateSeoRoutes();
}

export function invalidateStorePublicData(input: {
  storeId?: string | null;
  storeSlug?: string | null;
}) {
  const storeId = safeId(input.storeId);
  const storeSlug = safeSlug(input.storeSlug);

  revalidateTag(CACHE_TAGS.marketplaceStores, "max");
  revalidateTag(CACHE_TAGS.products, "max");

  if (storeId) {
    revalidateTag(CACHE_TAGS.store(storeId), "max");
    revalidateTag(CACHE_TAGS.storeProducts(storeId), "max");
  }

  revalidateLocalizedPath("/");
  revalidateLocalizedPath("/products");

  if (storeSlug) {
    revalidateLocalizedPath(`/${storeSlug}`);
    revalidateLocalizedPath(`/store/${storeSlug}`);
  }

  revalidateSeoRoutes();
}
