import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CartProduct,
  MarketplaceProductDetail,
  MarketplaceStore,
} from "@/lib/cart/types";

type ProductRow = {
  id: string;
  store_id: string;
  slug?: string;
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
  }>;
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
    storeId: row.store_id,
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

function readSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function getMarketplaceProducts(locale = "az") {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("products")
    .select(
      "id,store_id,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary)",
    )
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  return ((data ?? []) as ProductRow[]).map((row) => toCartProduct(row, locale));
}

export async function getMarketplaceStores(input: {
  locale?: string;
  categoryId?: string;
  limit?: number;
} = {}) {
  const supabase = await createSupabaseServerClient();
  const { data: stores } = await (supabase as any)
    .from("stores")
    .select("id,name,slug,description,logo_url,cover_url,settings")
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    })
    .limit(input.limit ?? 60);
  const storeRows = (stores ?? []) as StoreRow[];
  const storeIds = storeRows.map((store) => store.id);

  if (storeIds.length === 0) {
    return [];
  }

  let productQuery = (supabase as any)
    .from("products")
    .select(
      "id,store_id,category_id,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary)",
    )
    .eq("status", "active")
    .in("store_id", storeIds)
    .order("created_at", {
      ascending: false,
    });

  if (input.categoryId) {
    productQuery = productQuery.eq("category_id", input.categoryId);
  }

  const { data: products } = await productQuery.limit(300);
  const productRows = (products ?? []) as ProductRow[];
  const productsByStore = new Map<string, ProductRow[]>();

  productRows.forEach((product) => {
    const current = productsByStore.get(product.store_id) ?? [];
    current.push(product);
    productsByStore.set(product.store_id, current);
  });

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
          .map((product) => toCartProduct(product, input.locale ?? "az")),
        categoryIds: Array.from(
          new Set(
            storeProducts
              .map((product) => product.category_id)
              .filter((value): value is string => Boolean(value)),
          ),
        ),
      };
    })
    .filter((store) => store.productCount > 0);
}

export async function getMarketplaceStoreBySlug(input: {
  slug: string;
  locale?: string;
  categoryId?: string;
}) {
  const supabase = await createSupabaseServerClient();
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
      "id,store_id,category_id,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary)",
    )
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (input.categoryId) {
    productQuery = productQuery.eq("category_id", input.categoryId);
  }

  const { data: products } = await productQuery.limit(200);
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
}): Promise<MarketplaceProductDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("products")
    .select(
      "id,store_id,category_id,slug,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary),stores(id,name,slug,description,logo_url,cover_url,settings)",
    )
    .eq("id", input.productId)
    .eq("status", "active")
    .maybeSingle();

  if (!data || !data.stores) {
    return null;
  }

  const row = data as ProductRow & {
    stores: StoreRow;
  };

  return {
    product: {
      ...toCartProduct(row, input.locale ?? "az"),
      slug: row.slug ?? row.id,
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
      "id,store_id,name,description,name_translations,description_translations,price_amount,discount_amount,stock_quantity,deposit_enabled,deposit_type,deposit_value,product_images(url,is_primary)",
    )
    .eq("status", "active")
    .in("id", productIds);

  return ((data ?? []) as ProductRow[]).map((row) => toCartProduct(row, locale));
}
