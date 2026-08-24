import {
  CACHE_TAGS,
  CACHE_TTL,
  publicCache,
} from "@/lib/cache/public-cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CategoryOption,
  ManagedProduct,
  ProductOptionInput,
  ProductOptionType,
  ProductStatus,
  ProductVariantCombinationInput,
} from "@/lib/products/types";
import { PRODUCT_OPTION_TYPES, normalizeProductOptions } from "@/lib/products/variant-utils";

type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  name_translations: Record<string, string> | null;
  category_id: string | null;
  cost_amount: string | number | null;
  price_amount: string | number;
  discount_amount: string | number;
  stock_quantity: number;
  status: ProductStatus;
  description: string | null;
  description_translations: Record<string, string> | null;
  seo_title_translations: Record<string, string> | null;
  seo_description_translations: Record<string, string> | null;
  listing_type: "store" | "personal";
  deposit_enabled: boolean;
  deposit_type: "fixed" | "percent";
  deposit_value: string | number;
  metadata: {
    payment_status?: string;
    variants?: Array<{
      name: string;
      value: string;
      priceDeltaAmount: number;
      stockQuantity: number;
    }>;
    variant_options?: ProductOptionInput[];
    variant_combinations?: ProductVariantCombinationInput[];
  } | null;
  product_images?: Array<{
    id: string;
    url: string;
    alt_text: string | null;
  }>;
  product_variants?: Array<{
    id?: string;
    name: string;
    value: string;
    price_delta_amount?: string | number | null;
    stock_quantity: number;
    combination?: Record<string, string> | null;
    sku?: string | null;
    price_override_amount?: string | number | null;
    is_enabled?: boolean | null;
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
};

const publicRootCategorySlugs = [
  "elektronika",
  "ev-ve-bag",
  "moda",
  "gozellik-ve-baxim",
  "ana-ve-usaq",
  "idman-ve-outdoor",
  "avto-mehsullari",
  "tikinti-ve-aletler",
  "ofis-ve-defterxana",
  "kitablar",
  "ev-heyvanlari",
  "qida-ve-ickiler",
];

function toManagedProduct(row: ProductRow): ManagedProduct {
  const optionsFromRows = (row.product_options ?? [])
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
    );
  const optionSource =
    optionsFromRows.length > 0
      ? optionsFromRows
      : row.metadata?.variant_options ?? [];
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
  const flatVariants = row.product_variants
    ? row.product_variants.map((variant) => ({
        name: variant.name,
        value: variant.value,
        priceDeltaAmount: Number(variant.price_delta_amount ?? 0),
        stockQuantity: Number(variant.stock_quantity ?? 0),
      }))
    : row.metadata?.variants ?? [];

  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    nameTranslations: row.name_translations ?? {},
    categoryId: row.category_id,
    costAmount: Number(row.cost_amount ?? 0),
    priceAmount: Number(row.price_amount),
    discountAmount: Number(row.discount_amount ?? 0),
    stockQuantity: row.stock_quantity,
    status: row.status,
    description: row.description,
    descriptionTranslations: row.description_translations ?? {},
    seoTitleTranslations: row.seo_title_translations ?? {},
    seoDescriptionTranslations: row.seo_description_translations ?? {},
    listingType: row.listing_type,
    paymentStatus: row.metadata?.payment_status,
    depositEnabled: row.deposit_enabled,
    depositType: row.deposit_type,
    depositValue: Number(row.deposit_value ?? 0),
    images: (row.product_images ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.alt_text,
    })),
    variants: flatVariants.map((variant) => ({
      name: variant.name,
      value: variant.value,
      priceDeltaAmount: Number(variant.priceDeltaAmount ?? 0),
      stockQuantity: Number(variant.stockQuantity ?? 0),
    })),
    options: normalizeProductOptions(optionSource),
    variantCombinations:
      variantCombinations.length > 0
        ? variantCombinations
        : row.metadata?.variant_combinations ?? [],
  };
}

function sortPublicRootCategories(categories: CategoryOption[]) {
  const order = new Map(
    publicRootCategorySlugs.map((slug, index) => [slug, index]),
  );

  return categories
    .filter((category) => order.has(category.slug))
    .sort((a, b) => Number(order.get(a.slug)) - Number(order.get(b.slug)));
}

const getRootCategoryOptionsCached = publicCache(
  async () => {
    const supabase = createSupabasePublicClient();
    const { data } = await (supabase as any)
      .from("categories")
      .select("id,name,slug,parent_id")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order", {
        ascending: true,
      });

    return sortPublicRootCategories((data ?? []) as CategoryOption[]);
  },
  ["public-root-categories"],
  {
    revalidate: CACHE_TTL.MEDIUM,
    tags: [CACHE_TAGS.categories, CACHE_TAGS.homepage],
  },
);

export async function getCategoryOptions(options?: { rootOnly?: boolean }) {
  if (options?.rootOnly) {
    return getRootCategoryOptionsCached();
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("categories")
    .select("id,name,slug,parent_id")
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    });

  return (data ?? []) as CategoryOption[];
}

export async function getManagedProducts(filters: {
  storeIds?: string[];
  ownerId?: string;
  listingType?: "store" | "personal";
}) {
  const supabase = await createSupabaseServerClient();
  let query = (supabase as any)
    .from("products")
    .select(
      "id,store_id,name,name_translations,category_id,cost_amount,price_amount,discount_amount,stock_quantity,status,description,description_translations,seo_title_translations,seo_description_translations,listing_type,deposit_enabled,deposit_type,deposit_value,metadata,product_images(id,url,alt_text),product_options(id,name,type,is_enabled,sort_order,product_option_values(id,value,color_hex,sort_order)),product_variants(id,name,value,price_delta_amount,stock_quantity,combination,sku,price_override_amount,is_enabled)",
    )
    .order("created_at", {
      ascending: false,
    });

  if (filters.storeIds) {
    query = query.in(
      "store_id",
      filters.storeIds.length > 0
        ? filters.storeIds
        : ["00000000-0000-0000-0000-000000000000"],
    );
  }

  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }

  if (filters.listingType) {
    query = query.eq("listing_type", filters.listingType);
  }

  const { data } = await query;

  return ((data ?? []) as ProductRow[]).map(toManagedProduct);
}
