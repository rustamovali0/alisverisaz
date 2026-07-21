import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CartProduct } from "@/lib/cart/types";

type ProductRow = {
  id: string;
  store_id: string;
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
  product_images?: Array<{
    url: string;
    is_primary: boolean;
  }>;
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
