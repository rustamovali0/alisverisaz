import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CategoryOption, ManagedProduct, ProductStatus } from "@/lib/products/types";

type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  name_translations: Record<string, string> | null;
  category_id: string | null;
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
  } | null;
  product_images?: Array<{
    id: string;
    url: string;
    alt_text: string | null;
  }>;
  product_variants?: Array<{
    name: string;
    value: string;
    price_delta_amount: string | number;
    stock_quantity: number;
  }>;
};

function toManagedProduct(row: ProductRow): ManagedProduct {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    nameTranslations: row.name_translations ?? {},
    categoryId: row.category_id,
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
    variants: (row.product_variants ?? row.metadata?.variants ?? []).map((variant) => ({
      name: variant.name,
      value: variant.value,
      priceDeltaAmount: Number(
        "price_delta_amount" in variant
          ? variant.price_delta_amount
          : variant.priceDeltaAmount,
      ),
      stockQuantity: Number(
        "stock_quantity" in variant ? variant.stock_quantity : variant.stockQuantity,
      ),
    })),
  };
}

export async function getCategoryOptions(options?: { rootOnly?: boolean }) {
  const supabase = await createSupabaseServerClient();
  let query = (supabase as any)
    .from("categories")
    .select("id,name,slug,parent_id")
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    });

  if (options?.rootOnly) {
    query = query.is("parent_id", null);
  }

  const { data } = await query;

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
      "id,store_id,name,name_translations,category_id,price_amount,discount_amount,stock_quantity,status,description,description_translations,seo_title_translations,seo_description_translations,listing_type,deposit_enabled,deposit_type,deposit_value,metadata,product_images(id,url,alt_text),product_variants(name,value,price_delta_amount,stock_quantity)",
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
