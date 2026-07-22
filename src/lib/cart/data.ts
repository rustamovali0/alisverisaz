import { unstable_cache } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CartProduct,
  MarketplaceProductDetail,
  MarketplaceStore,
} from "@/lib/cart/types";

type ProductRow = {
  id: string;
  store_id: string;
  slug: string | null;
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
  stores?: {
    slug: string | null;
  } | null;
};

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  settings?: Record<string, unknown> | null;
};

const PUBLIC_MARKETPLACE_REVALIDATE_SECONDS = 30;

function readLocalizedText(
  fallback: string | null,
  translations: Record<string, string> | null | undefined,
  locale: string,
) {
  return translations?.[locale] || fallback || "";
}

function toCartProduct(row: ProductRow, locale = "az"): CartProduct {
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

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    storeId: row.store_id,
    storeSlug: row.stores?.slug ?? null,
    name: readLocalizedText(row.name, row.name_translations, locale),
    description: readLocalizedText(
      row.description,
      row.description_translations,
      locale,
    ),
    priceAmount: Number(row.price_amount),
    discountAmount: Number(row.discount_amount ?? 0),
    stockQuantity: row.stock_quantity,
    imageUrl: primary?.url ?? first?.url ?? null,
    depositEnabled: row.deposit_enabled,
    depositType: row.deposit_type,
    depositValue,
    depositAmount,
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
    .toLocaleLowerCase("az-AZ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getMarketplaceProducts(locale = "az") {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("products")
    .select(
      "id,store_id,slug,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),stores(slug)",
    )
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  return ((data ?? []) as ProductRow[]).map((row) => toCartProduct(row, locale));
}

async function getMarketplaceStoresUncached(
  locale: string,
  categoryId: string,
  searchQuery: string,
  limit: number,
) {
  const supabase = createSupabaseAdminClient();
  const { data: stores } = await (supabase as any)
    .from("stores")
    .select("id,name,slug,description,logo_url,cover_url,settings")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);
  const storeRows = (stores ?? []) as StoreRow[];
  const storeIds = storeRows.map((store) => store.id);

  if (storeIds.length === 0) {
    return [];
  }

  let productQuery = (supabase as any)
    .from("products")
    .select(
      "id,store_id,category_id,slug,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order)",
    )
    .eq("status", "active")
    .in("store_id", storeIds)
    .order("created_at", {
      ascending: false,
    });

  if (categoryId) {
    productQuery = productQuery.eq("category_id", categoryId);
  }

  const productLimit = Math.min(
    Math.max(storeRows.length * (categoryId || searchQuery ? 8 : 4), 24),
    categoryId || searchQuery ? 120 : 80,
  );
  const { data: products } = await productQuery.limit(productLimit);
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
          .map((product) => toCartProduct(product, locale)),
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
      if (store.productCount === 0) {
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

const getMarketplaceStoresCached = unstable_cache(
  getMarketplaceStoresUncached,
  ["marketplace-stores-v3"],
  {
    revalidate: PUBLIC_MARKETPLACE_REVALIDATE_SECONDS,
    tags: ["public-marketplace"],
  },
);

export async function getMarketplaceStores(input: {
  locale?: string;
  categoryId?: string;
  searchQuery?: string;
  limit?: number;
} = {}) {
  return getMarketplaceStoresCached(
    input.locale ?? "az",
    input.categoryId ?? "",
    input.searchQuery ?? "",
    input.limit ?? 60,
  );
}

export async function getMarketplaceStoreBySlug(input: {
  slug: string;
  locale?: string;
  categoryId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id,name,slug,description,logo_url,cover_url,settings")
    .eq("slug", input.slug)
    .eq("status", "active")
    .maybeSingle();

  if (!store) {
    return null;
  }

  let productQuery = (supabase as any)
    .from("products")
    .select(
      "id,store_id,category_id,slug,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order)",
    )
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (input.categoryId) {
    productQuery = productQuery.eq("category_id", input.categoryId);
  }

  const { data: products } = await productQuery.limit(72);
  const productRows = (products ?? []) as ProductRow[];

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    address: readSetting(store.settings, "address"),
    phone: readSetting(store.settings, "phone"),
    logoUrl: store.logo_url,
    coverUrl: store.cover_url,
    productCount: productRows.length,
    sampleProducts: productRows.map((product) =>
      toCartProduct(product, input.locale ?? "az"),
    ),
    categoryIds: Array.from(
      new Set(
        productRows
          .map((product) => product.category_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  } satisfies MarketplaceStore;
}

export async function getMarketplaceProductById(input: {
  productId: string;
  locale?: string;
  storeSlug?: string;
}): Promise<MarketplaceProductDetail | null> {
  const supabase = await createSupabaseServerClient();

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

  let query = (supabase as any)
    .from("products")
    .select(
      "id,store_id,category_id,slug,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),stores(id,name,slug,description,logo_url,cover_url,settings)",
    )
    .eq("status", "active");

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  query = isUuid(input.productId)
    ? query.eq("id", input.productId)
    : query.eq("slug", input.productId);

  const { data } = await query.maybeSingle();

  if (!data || !data.stores) {
    return null;
  }

  const row = data as ProductRow & {
    stores: StoreRow;
  };

  return {
    product: {
      ...toCartProduct(row, input.locale ?? "az"),
      images: toProductImages(row),
    },
    store: {
      id: row.stores.id,
      name: row.stores.name,
      slug: row.stores.slug,
      description: row.stores.description,
      address: readSetting(row.stores.settings, "address"),
      phone: readSetting(row.stores.settings, "phone"),
      logoUrl: row.stores.logo_url,
      coverUrl: row.stores.cover_url,
      productCount: 0,
      sampleProducts: [],
      categoryIds: row.category_id ? [row.category_id] : [],
    },
  };
}

export async function getCartProducts(productIds: string[], locale = "az") {
  if (productIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("products")
    .select(
      "id,store_id,slug,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary,sort_order),stores(slug)",
    )
    .eq("status", "active")
    .in("id", productIds);

  return ((data ?? []) as ProductRow[]).map((row) => toCartProduct(row, locale));
}
