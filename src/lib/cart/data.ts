import {
  CACHE_TAGS,
  CACHE_TTL,
  normalizeCacheLocale,
  publicCache,
} from "@/lib/cache/public-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CartProduct,
  MarketplaceProductDetail,
  MarketplaceProductPage,
  MarketplaceProductSort,
  MarketplaceStore,
} from "@/lib/cart/types";
import type {
  ProductOptionInput,
  ProductOptionType,
  ProductVariantCombinationInput,
} from "@/lib/products/types";
import { PRODUCT_OPTION_TYPES, normalizeProductOptions } from "@/lib/products/variant-utils";

type ProductRow = {
  id: string;
  store_id: string;
  slug: string | null;
  created_at?: string | null;
  name: string;
  description: string | null;
  name_translations?: Record<string, string> | null;
  description_translations?: Record<string, string> | null;
  price_amount: string | number;
  discount_amount: string | number | null;
  stock_quantity: number;
  deposit_enabled: boolean;
  deposit_type: "fixed" | "percent";
  deposit_value: string | number;
  category_id?: string | null;
  product_images?: Array<{
    url: string;
    is_primary: boolean;
    sort_order?: number | null;
  }>;
  product_options?: Array<{
    id: string;
    name: string;
    type: ProductOptionType;
    is_enabled: boolean;
    sort_order: number | null;
    product_option_values?: Array<{
      id: string;
      value: string;
      color_hex: string | null;
      sort_order: number | null;
    }>;
  }>;
  product_variants?: Array<{
    id?: string;
    name?: string | null;
    value?: string | null;
    price_delta_amount?: string | number | null;
    stock_quantity: number;
    combination?: Record<string, string> | null;
    sku?: string | null;
    price_override_amount?: string | number | null;
    is_enabled?: boolean | null;
  }>;
  stores?: {
    name?: string | null;
    slug: string | null;
  } | null;
};

const PUBLIC_PRODUCT_SELECT =
  "id,store_id,category_id,slug,created_at,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),product_options(id,name,type,is_enabled,sort_order,product_option_values(id,value,color_hex,sort_order)),product_variants(id,name,value,price_delta_amount,stock_quantity,combination,sku,price_override_amount,is_enabled),stores(name,slug)";
const PUBLIC_PRODUCT_SELECT_LEGACY =
  "id,store_id,category_id,slug,created_at,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),product_variants(name,value,price_delta_amount,stock_quantity),stores(name,slug)";
const PUBLIC_PRODUCT_SELECT_NO_STORE =
  "id,store_id,category_id,slug,created_at,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),product_options(id,name,type,is_enabled,sort_order,product_option_values(id,value,color_hex,sort_order)),product_variants(id,name,value,price_delta_amount,stock_quantity,combination,sku,price_override_amount,is_enabled)";
const PUBLIC_PRODUCT_SELECT_NO_STORE_LEGACY =
  "id,store_id,category_id,slug,created_at,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),product_variants(name,value,price_delta_amount,stock_quantity)";
const PRODUCT_DETAIL_SELECT =
  "id,store_id,category_id,slug,created_at,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),product_options(id,name,type,is_enabled,sort_order,product_option_values(id,value,color_hex,sort_order)),product_variants(id,name,value,price_delta_amount,stock_quantity,combination,sku,price_override_amount,is_enabled),stores(id,owner_id,name,slug,description,logo_url,cover_url,updated_at,settings)";
const PRODUCT_DETAIL_SELECT_LEGACY =
  "id,store_id,category_id,slug,created_at,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),product_variants(name,value,price_delta_amount,stock_quantity),stores(id,owner_id,name,slug,description,logo_url,cover_url,updated_at,settings)";

type StoreRow = {
  id: string;
  owner_id?: string | null;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  updated_at?: string | null;
  settings?: Record<string, unknown> | null;
};

const MAX_PUBLIC_LIST_LIMIT = 120;
const DEFAULT_PRODUCT_PAGE_LIMIT = 50;
const MAX_PRODUCT_PAGE_LIMIT = 50;
const MAX_SEARCH_LENGTH = 120;

type ProductCursor = {
  createdAt?: string | null;
  id: string;
  price?: number;
};

function isMissingVariantSchemaError(error: unknown) {
  const value = error as { code?: string; message?: string; details?: string } | null;
  const text = `${value?.message ?? ""} ${value?.details ?? ""}`.toLowerCase();

  return (
    value?.code === "PGRST200" ||
    value?.code === "PGRST205" ||
    value?.code === "42P01" ||
    value?.code === "42703" ||
    text.includes("product_options") ||
    text.includes("product_option_values") ||
    text.includes("price_override_amount") ||
    text.includes("combination") ||
    text.includes("schema cache") ||
    text.includes("relationship")
  );
}

function readOriginalContentText(fallback: string | null) {
  return fallback || "";
}

function toCartProduct(row: ProductRow): CartProduct {
  const primary = row.product_images?.find((image) => image.is_primary);
  const first = row.product_images?.[0];
  const finalPrice = Math.max(
    Number(row.price_amount) - Number(row.discount_amount ?? 0),
    0,
  );
  const depositValue = Number(row.deposit_value ?? 0);
  const depositAmount =
    row.deposit_type === "percent"
      ? Math.round(finalPrice * (depositValue / 100) * 100) / 100
      : depositValue;

  const options = normalizeProductOptions(
    (row.product_options ?? [])
      .filter((option) => PRODUCT_OPTION_TYPES.includes(option.type))
      .map(
        (option): ProductOptionInput => ({
          id: option.id,
          type: option.type,
          name: option.name,
          isEnabled: option.is_enabled,
          sortOrder: option.sort_order ?? 0,
          values: (option.product_option_values ?? []).map((value) => ({
            id: value.id,
            value: value.value,
            colorHex: value.color_hex,
            sortOrder: value.sort_order ?? 0,
          })),
        }),
      ),
  );
  const variantCombinations = (row.product_variants ?? [])
    .filter((variant) => variant.combination && Object.keys(variant.combination).length > 0)
    .map(
      (variant): ProductVariantCombinationInput => ({
        id: variant.id,
        combination: variant.combination ?? {},
        sku: variant.sku ?? null,
        priceOverrideAmount:
          variant.price_override_amount === null ||
          variant.price_override_amount === undefined
            ? null
            : Number(variant.price_override_amount),
        stockQuantity: Number(variant.stock_quantity ?? 0),
        isEnabled: variant.is_enabled !== false,
      }),
    );

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    storeId: row.store_id,
    categoryId: row.category_id ?? null,
    storeSlug: row.stores?.slug ?? null,
    storeName: row.stores?.name ?? null,
    createdAt: row.created_at ?? null,
    name: readOriginalContentText(row.name),
    description: readOriginalContentText(row.description),
    priceAmount: Number(row.price_amount),
    discountAmount: Number(row.discount_amount ?? 0),
    stockQuantity: row.stock_quantity,
    imageUrl: primary?.url ?? first?.url ?? null,
    depositEnabled: row.deposit_enabled,
    depositType: row.deposit_type,
    depositValue,
    depositAmount,
    options,
    variantCombinations,
  };
}

function toProductImages(row: ProductRow) {
  return [...(row.product_images ?? [])]
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1;
      }

      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    })
    .map((image) => ({
      url: image.url,
      isPrimary: image.is_primary,
    }));
}

function readSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSearchValue(value: string) {
  return value
    .slice(0, MAX_SEARCH_LENGTH)
    .toLocaleLowerCase("az-AZ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeRawSearchValue(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function clampProductLimit(limit: number | undefined) {
  if (!Number.isFinite(limit ?? DEFAULT_PRODUCT_PAGE_LIMIT)) {
    return DEFAULT_PRODUCT_PAGE_LIMIT;
  }

  return Math.min(
    Math.max(Math.trunc(limit ?? DEFAULT_PRODUCT_PAGE_LIMIT), 1),
    MAX_PRODUCT_PAGE_LIMIT,
  );
}

function normalizeProductSort(sort: string | null | undefined): MarketplaceProductSort {
  if (sort === "oldest" || sort === "price_asc" || sort === "price_desc") {
    return sort;
  }

  return "newest";
}

function encodeProductCursor(product: CartProduct, sort: MarketplaceProductSort) {
  const cursor: ProductCursor = {
    createdAt: product.createdAt,
    id: product.id,
  };

  if (sort === "price_asc" || sort === "price_desc") {
    cursor.price = Math.max(product.priceAmount - product.discountAmount, 0);
  }

  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeProductCursor(cursor: string | null | undefined): ProductCursor | null {
  if (!cursor) {
    return null;
  }

  if (!/^[A-Za-z0-9_-]{8,512}$/.test(cursor)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as ProductCursor;

    if (!parsed || !isUuid(parsed.id)) {
      return null;
    }

    if (
      parsed.createdAt !== null &&
      parsed.createdAt !== undefined &&
      Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      return null;
    }

    if (
      parsed.price !== undefined &&
      (!Number.isFinite(Number(parsed.price)) || Number(parsed.price) < 0)
    ) {
      return null;
    }

    return {
      id: parsed.id,
      createdAt: parsed.createdAt ?? null,
      price: parsed.price === undefined ? undefined : Number(parsed.price),
    };
  } catch {
    return null;
  }
}

function applyProductSort(query: any, sort: MarketplaceProductSort) {
  if (sort === "oldest") {
    return query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
  }

  if (sort === "price_asc") {
    return query
      .order("price_amount", { ascending: true })
      .order("id", { ascending: true });
  }

  if (sort === "price_desc") {
    return query
      .order("price_amount", { ascending: false })
      .order("id", { ascending: false });
  }

  return query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
}

function applyProductCursor(query: any, cursor: ProductCursor | null, sort: MarketplaceProductSort) {
  if (!cursor) {
    return query;
  }

  if (sort === "oldest") {
    if (!cursor.createdAt) {
      return query;
    }

    return query.or(
      `created_at.gt.${cursor.createdAt ?? ""},and(created_at.eq.${cursor.createdAt ?? ""},id.gt.${cursor.id})`,
    );
  }

  if (sort === "price_asc") {
    return query.or(
      `price_amount.gt.${cursor.price ?? 0},and(price_amount.eq.${cursor.price ?? 0},id.gt.${cursor.id})`,
    );
  }

  if (sort === "price_desc") {
    return query.or(
      `price_amount.lt.${cursor.price ?? 0},and(price_amount.eq.${cursor.price ?? 0},id.lt.${cursor.id})`,
    );
  }

  if (!cursor.createdAt) {
    return query;
  }

  return query.or(
    `created_at.lt.${cursor.createdAt ?? ""},and(created_at.eq.${cursor.createdAt ?? ""},id.lt.${cursor.id})`,
  );
}

export async function getMarketplaceProducts(
  locale = "az",
  input: {
    categoryId?: string;
    searchQuery?: string;
    storeId?: string;
    limit?: number;
    cursor?: string | null;
    sort?: string | null;
  } = {},
): Promise<CartProduct[]> {
  const page = await getMarketplaceProductPage(locale, input);

  return page.products;
}

export async function getMarketplaceProductPage(
  locale = "az",
  input: {
    categoryId?: string;
    searchQuery?: string;
    storeId?: string;
    limit?: number;
    cursor?: string | null;
    sort?: string | null;
  } = {},
): Promise<MarketplaceProductPage> {
  const normalizedLocale = normalizeCacheLocale(locale);
  const categoryId = input.categoryId && isUuid(input.categoryId) ? input.categoryId : "";
  const storeId = input.storeId && isUuid(input.storeId) ? input.storeId : "";
  const rawSearch = normalizeRawSearchValue(input.searchQuery);
  const normalizedSearch = normalizeSearchValue(rawSearch);
  const limit = clampProductLimit(input.limit);
  const sort = normalizeProductSort(input.sort);

  if (!normalizedSearch && !input.cursor && sort === "newest") {
    return publicCache(
      () =>
        getMarketplaceProductPageUncached(normalizedLocale, {
          categoryId,
          searchQuery: "",
          storeId,
          limit,
          cursor: null,
          sort,
        }),
      [
        "marketplace-products",
        normalizedLocale,
        categoryId || "all",
        storeId || "all-stores",
        String(limit),
      ],
      {
        revalidate: CACHE_TTL.SHORT,
        tags: [
          CACHE_TAGS.products,
          ...(categoryId ? [CACHE_TAGS.category(categoryId)] : []),
          ...(storeId ? [CACHE_TAGS.storeProducts(storeId)] : []),
          CACHE_TAGS.homepage,
        ],
      },
    )();
  }

  return getMarketplaceProductPageUncached(normalizedLocale, {
    categoryId,
    searchQuery: rawSearch,
    storeId,
    limit,
    cursor: input.cursor ?? null,
    sort,
  });
}

export async function getSimilarMarketplaceProductPage(
  locale = "az",
  input: {
    productId: string;
    categoryId: string;
    limit?: number;
    cursor?: string | null;
  },
): Promise<MarketplaceProductPage> {
  const productId = isUuid(input.productId) ? input.productId : "";
  const categoryId = isUuid(input.categoryId) ? input.categoryId : "";

  if (!productId || !categoryId) {
    return { products: [], nextCursor: null, hasMore: false };
  }

  const limit = clampProductLimit(input.limit);
  const cursor = decodeProductCursor(input.cursor);
  const supabase = createSupabasePublicClient();

  async function runQuery(selectColumns: string) {
    const query = (supabase as any)
      .from("products")
      .select(selectColumns)
      .eq("status", "active")
      .eq("category_id", categoryId)
      .neq("id", productId);

    return applyProductSort(
      applyProductCursor(query, cursor, "newest"),
      "newest",
    ).limit(limit + 1);
  }

  let { data, error } = await runQuery(PUBLIC_PRODUCT_SELECT);

  if (error && isMissingVariantSchemaError(error)) {
    const fallback = await runQuery(PUBLIC_PRODUCT_SELECT_LEGACY);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as ProductRow[]).map(toCartProduct);
  const products = rows.slice(0, limit);
  const lastProduct = products.at(-1);

  return {
    products,
    hasMore: rows.length > limit,
    nextCursor:
      rows.length > limit && lastProduct
        ? encodeProductCursor(lastProduct, "newest")
        : null,
  };
}

async function getMarketplaceProductPageUncached(
  locale: string,
  input: {
    categoryId?: string;
    searchQuery?: string;
    storeId?: string;
    limit: number;
    cursor: string | null;
    sort: MarketplaceProductSort;
  },
): Promise<MarketplaceProductPage> {
  const supabase = createSupabasePublicClient();
  const cursor = decodeProductCursor(input.cursor);
  const normalizedSearch = normalizeSearchValue(input.searchQuery ?? "");

  async function runQuery(selectColumns: string) {
    let query = (supabase as any)
      .from("products")
      .select(selectColumns)
      .eq("status", "active");

    if (input.categoryId && isUuid(input.categoryId)) {
      query = query.eq("category_id", input.categoryId);
    }

    if (input.storeId && isUuid(input.storeId)) {
      query = query.eq("store_id", input.storeId);
    }

    if (normalizedSearch) {
      const escaped = normalizedSearch.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    return applyProductSort(
      applyProductCursor(query, cursor, input.sort),
      input.sort,
    ).limit(input.limit + 1);
  }

  let { data, error } = await runQuery(PUBLIC_PRODUCT_SELECT);

  if (error && isMissingVariantSchemaError(error)) {
    const fallback = await runQuery(PUBLIC_PRODUCT_SELECT_LEGACY);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as ProductRow[]).map((row) => toCartProduct(row));
  const products = rows.slice(0, input.limit);
  const lastProduct = products.at(-1);

  return {
    products,
    hasMore: rows.length > input.limit,
    nextCursor:
      rows.length > input.limit && lastProduct
        ? encodeProductCursor(lastProduct, input.sort)
        : null,
  };
}

export async function getFavoriteMarketplaceProducts(locale = "az", userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: favorites } = await (supabase as any)
    .from("favorites")
    .select("id,product_id")
    .eq("user_id", userId);
  const productIds = Array.from(
    new Set(
      ((favorites ?? []) as Array<{ product_id?: string | null }>)
        .map((favorite) => favorite.product_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (productIds.length === 0) {
    return [];
  }

  const favoriteOrder = new Map(productIds.map((productId, index) => [productId, index]));
  let { data, error } = await (supabase as any)
    .from("products")
    .select(PUBLIC_PRODUCT_SELECT)
    .eq("status", "active")
    .in("id", productIds);

  if (error && isMissingVariantSchemaError(error)) {
    const fallback = await (supabase as any)
      .from("products")
      .select(PUBLIC_PRODUCT_SELECT_LEGACY)
      .eq("status", "active")
      .in("id", productIds);

    data = fallback.data;
  }

  return ((data ?? []) as ProductRow[])
    .map((row) => toCartProduct(row))
    .sort(
      (a, b) =>
        (favoriteOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (favoriteOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
}

async function getMarketplaceStoresUncached(
  locale: string,
  categoryId: string,
  searchQuery: string,
  limit: number,
) {
  const supabase = createSupabaseAdminClient();
  const { data: stores, error: storesError } = await (supabase as any)
    .from("stores")
    .select("id,name,slug,description,logo_url,cover_url,updated_at,settings")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (storesError) {
    throw new Error(storesError.message);
  }

  const storeRows = (stores ?? []) as StoreRow[];
  const storeIds = storeRows.map((store) => store.id);

  if (storeIds.length === 0) {
    return [];
  }

  const productLimit = Math.min(
    Math.max(storeRows.length * (categoryId || searchQuery ? 8 : 4), 24),
    categoryId || searchQuery ? 120 : 80,
  );

  async function runStoreProductsQuery(selectColumns: string) {
    let productQuery = (supabase as any)
      .from("products")
      .select(selectColumns)
      .eq("status", "active")
      .in("store_id", storeIds)
      .order("created_at", {
        ascending: false,
      });

    if (categoryId) {
      productQuery = productQuery.eq("category_id", categoryId);
    }

    return productQuery.limit(productLimit);
  }

  let { data: products, error: productsError } = await runStoreProductsQuery(
    PUBLIC_PRODUCT_SELECT_NO_STORE,
  );

  if (productsError && isMissingVariantSchemaError(productsError)) {
    const fallback = await runStoreProductsQuery(PUBLIC_PRODUCT_SELECT_NO_STORE_LEGACY);
    products = fallback.data;
    productsError = fallback.error;
  }

  if (productsError) {
    throw new Error(productsError.message);
  }
  const productRows = (products ?? []) as ProductRow[];
  const productsByStore = new Map<string, ProductRow[]>();

  productRows.forEach((product) => {
    const current = productsByStore.get(product.store_id) ?? [];
    current.push(product);
    productsByStore.set(product.store_id, current);
  });

  const normalizedSearch = normalizeSearchValue(searchQuery);

  return storeRows
    .map((store): MarketplaceStore => {
      const storeProducts = productsByStore.get(store.id) ?? [];

      return {
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        address: readSetting(store.settings, "address"),
        phone: readSetting(store.settings, "phone"),
        logoUrl: store.logo_url,
        coverUrl: store.cover_url,
        productCount: storeProducts.length,
        sampleProducts: storeProducts
          .slice(0, 4)
          .map((product) => toCartProduct(product)),
        categoryIds: Array.from(
          new Set(
            storeProducts
              .map((product) => product.category_id)
              .filter((value): value is string => Boolean(value)),
          ),
        ),
      };
    })
    .filter((store) => {
      if ((categoryId || normalizedSearch) && store.productCount === 0) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        store.name,
        store.slug,
        store.description,
        store.address,
        ...store.sampleProducts.flatMap((product) => [
          product.name,
          product.description,
        ]),
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeSearchValue(searchableText).includes(normalizedSearch);
    });
}

export async function getMarketplaceStores(input: {
  locale?: string;
  categoryId?: string;
  searchQuery?: string;
  limit?: number;
} = {}) {
  const locale = normalizeCacheLocale(input.locale);
  const categoryId = input.categoryId && isUuid(input.categoryId) ? input.categoryId : "";
  const searchQuery = normalizeSearchValue(input.searchQuery ?? "");
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 60), 1), MAX_PUBLIC_LIST_LIMIT);

  if (searchQuery) {
    return getMarketplaceStoresUncached(locale, categoryId, searchQuery, limit);
  }

  return publicCache(
    () => getMarketplaceStoresUncached(locale, categoryId, "", limit),
    ["marketplace-stores", locale, categoryId || "all", String(limit)],
    {
      revalidate: CACHE_TTL.SHORT,
      tags: [
        CACHE_TAGS.marketplaceStores,
        CACHE_TAGS.products,
        ...(categoryId ? [CACHE_TAGS.category(categoryId)] : []),
        CACHE_TAGS.homepage,
      ],
    },
  )();
}

async function getMarketplaceStoreBySlugUncached(input: {
  slug: string;
  locale: string;
  categoryId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: store, error: storeError } = await (supabase as any)
    .from("stores")
    .select("id,owner_id,name,slug,description,logo_url,cover_url,updated_at,settings")
    .eq("slug", input.slug)
    .eq("status", "active")
    .maybeSingle();

  if (storeError) {
    throw new Error(storeError.message);
  }

  if (!store) {
    return null;
  }

  async function runStorePageProductsQuery(selectColumns: string) {
    let productQuery = (supabase as any)
      .from("products")
      .select(selectColumns, { count: "exact" })
      .eq("store_id", store.id)
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (input.categoryId) {
      productQuery = productQuery.eq("category_id", input.categoryId);
    }

    return productQuery.limit(DEFAULT_PRODUCT_PAGE_LIMIT + 1);
  }

  let { data: products, error: productsError, count } =
    await runStorePageProductsQuery(PUBLIC_PRODUCT_SELECT_NO_STORE);

  if (productsError && isMissingVariantSchemaError(productsError)) {
    const fallback = await runStorePageProductsQuery(
      PUBLIC_PRODUCT_SELECT_NO_STORE_LEGACY,
    );
    products = fallback.data;
    productsError = fallback.error;
    count = fallback.count;
  }

  if (productsError) {
    throw new Error(productsError.message);
  }

  const productRows = (products ?? []) as ProductRow[];
  const { data: categoryRows, error: categoryRowsError } = await (supabase as any)
    .from("products")
    .select("category_id")
    .eq("store_id", store.id)
    .eq("status", "active")
    .not("category_id", "is", null)
    .limit(1000);
  const pageProducts = productRows
    .slice(0, DEFAULT_PRODUCT_PAGE_LIMIT)
    .map((product) => toCartProduct(product));
  const lastProduct = pageProducts.at(-1);

  return {
    id: store.id,
    ownerId: store.owner_id ?? null,
    name: store.name,
    slug: store.slug,
    description: store.description,
    heroTitle: readSetting(store.settings, "heroTitle"),
    address: readSetting(store.settings, "address"),
    phone: readSetting(store.settings, "phone"),
    logoUrl: store.logo_url,
    coverUrl: store.cover_url,
    updatedAt: store.updated_at ?? null,
    productCount: count ?? pageProducts.length,
    sampleProducts: pageProducts,
    productHasMore: productRows.length > DEFAULT_PRODUCT_PAGE_LIMIT,
    productNextCursor:
      productRows.length > DEFAULT_PRODUCT_PAGE_LIMIT && lastProduct
        ? encodeProductCursor(lastProduct, "newest")
        : null,
    categoryIds: Array.from(
      new Set(
        (categoryRowsError ? productRows : ((categoryRows ?? []) as Array<{ category_id: string | null }>))
          .map((product) => product.category_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  } satisfies MarketplaceStore;
}

export async function getMarketplaceStoreBySlug(input: {
  slug: string;
  locale?: string;
  categoryId?: string;
}) {
  const slug = input.slug.trim().toLowerCase();
  const locale = normalizeCacheLocale(input.locale);
  const categoryId = input.categoryId && isUuid(input.categoryId) ? input.categoryId : "";

  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return null;
  }

  return publicCache(
    () =>
      getMarketplaceStoreBySlugUncached({
        slug,
        locale,
        categoryId,
      }),
    ["marketplace-store", slug, locale, categoryId || "all"],
    {
      revalidate: CACHE_TTL.SHORT,
      tags: [
        CACHE_TAGS.marketplaceStores,
        CACHE_TAGS.products,
        ...(categoryId ? [CACHE_TAGS.category(categoryId)] : []),
      ],
    },
  )();
}

async function getMarketplaceProductByIdUncached(input: {
  productId: string;
  locale: string;
  storeSlug: string;
}): Promise<MarketplaceProductDetail | null> {
  const supabase = createSupabasePublicClient();

  let storeId: string | undefined;

  if (input.storeSlug) {
    const { data: store } = await (supabase as any)
      .from("stores")
      .select("id")
      .eq("slug", input.storeSlug)
      .eq("status", "active")
      .maybeSingle();

    if (!store) {
      return null;
    }

    storeId = String(store.id);
  }

  async function runDetailQuery(selectColumns: string) {
    let query = (supabase as any)
      .from("products")
      .select(selectColumns)
      .eq("status", "active");

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    query = isUuid(input.productId)
      ? query.eq("id", input.productId)
      : query.eq("slug", input.productId);

    return query.maybeSingle();
  }

  let { data, error } = await runDetailQuery(PRODUCT_DETAIL_SELECT);

  if (error && isMissingVariantSchemaError(error)) {
    const fallback = await runDetailQuery(PRODUCT_DETAIL_SELECT_LEGACY);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !data.stores) {
    return null;
  }

  const row = data as ProductRow & {
    stores: StoreRow;
  };
  const { count: storeProductCount } = await (supabase as any)
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("store_id", row.stores.id)
    .eq("status", "active");

  return {
    product: {
      ...toCartProduct(row),
      images: toProductImages(row),
    },
    store: {
      id: row.stores.id,
      ownerId: row.stores.owner_id ?? null,
      name: row.stores.name,
      slug: row.stores.slug,
      description: row.stores.description,
      address: readSetting(row.stores.settings, "address"),
      phone: readSetting(row.stores.settings, "phone"),
      logoUrl: row.stores.logo_url,
      coverUrl: row.stores.cover_url,
      updatedAt: row.stores.updated_at ?? null,
      productCount: storeProductCount ?? 0,
      sampleProducts: [],
      categoryIds: row.category_id ? [row.category_id] : [],
    },
  };
}

export async function getMarketplaceProductById(input: {
  productId: string;
  locale?: string;
  storeSlug?: string;
}): Promise<MarketplaceProductDetail | null> {
  const productId = isUuid(input.productId)
    ? input.productId
    : input.productId.trim().toLowerCase();
  const storeSlug = input.storeSlug?.trim().toLowerCase() ?? "";
  const locale = normalizeCacheLocale(input.locale);

  if (!isUuid(productId) && !/^[a-z0-9-]{1,160}$/.test(productId)) {
    return null;
  }

  if (storeSlug && !/^[a-z0-9-]{1,120}$/.test(storeSlug)) {
    return null;
  }

  return publicCache(
    () =>
      getMarketplaceProductByIdUncached({
        productId,
        locale,
        storeSlug,
      }),
    ["marketplace-product", productId, locale, storeSlug || "any-store"],
    {
      revalidate: CACHE_TTL.SHORT,
      tags: [
        CACHE_TAGS.products,
        ...(isUuid(productId) ? [CACHE_TAGS.product(productId)] : []),
      ],
    },
  )();
}

export async function getCartProducts(productIds: string[], locale = "az") {
  if (productIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  let { data, error } = await (supabase as any)
    .from("products")
    .select(
      "id,store_id,slug,created_at,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),product_options(id,name,type,is_enabled,sort_order,product_option_values(id,value,color_hex,sort_order)),product_variants(id,name,value,price_delta_amount,stock_quantity,combination,sku,price_override_amount,is_enabled),stores(name,slug)",
    )
    .eq("status", "active")
    .in("id", productIds);

  if (error && isMissingVariantSchemaError(error)) {
    const fallback = await (supabase as any)
      .from("products")
      .select(
        "id,store_id,slug,created_at,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),product_variants(name,value,price_delta_amount,stock_quantity),stores(name,slug)",
      )
      .eq("status", "active")
      .in("id", productIds);

    data = fallback.data;
  }

  return ((data ?? []) as ProductRow[]).map((row) => toCartProduct(row));
}
