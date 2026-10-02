import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PromotionRequest,
  PromotionRequestStatus,
  PromotionTargetType,
} from "@/lib/promotions/types";

type PromotionRequestRow = {
  id: string;
  requester_id: string;
  target_type: PromotionTargetType;
  store_id: string;
  product_id: string | null;
  status: PromotionRequestStatus;
  requested_days: number;
  daily_price_amount: string | number;
  total_amount: string | number;
  currency: string | null;
  starts_at: string | null;
  ends_at: string | null;
  seller_note: string | null;
  admin_note: string | null;
  created_at: string;
};

async function hydratePromotionRows(rows: PromotionRequestRow[]) {
  const supabase = createSupabaseAdminClient();
  const storeIds = Array.from(new Set(rows.map((row) => row.store_id)));
  const productIds = Array.from(
    new Set(rows.map((row) => row.product_id).filter((id): id is string => Boolean(id))),
  );
  const profileIds = Array.from(new Set(rows.map((row) => row.requester_id)));

  const [storesResult, productsResult, profilesResult] = await Promise.all([
    storeIds.length
      ? (supabase as any).from("stores").select("id,name,slug").in("id", storeIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? (supabase as any).from("products").select("id,name").in("id", productIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? (supabase as any).from("profiles").select("id,full_name,email").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const stores = new Map(
    ((storesResult.data ?? []) as Array<{ id: string; name: string; slug: string | null }>).map(
      (store) => [store.id, store],
    ),
  );
  const products = new Map(
    ((productsResult.data ?? []) as Array<{ id: string; name: string | null }>).map(
      (product) => [product.id, product],
    ),
  );
  const profiles = new Map(
    ((profilesResult.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>).map((profile) => [profile.id, profile]),
  );

  return rows.map((row): PromotionRequest => {
    const store = stores.get(row.store_id);
    const product = row.product_id ? products.get(row.product_id) : null;
    const profile = profiles.get(row.requester_id);

    return {
      id: row.id,
      requesterId: row.requester_id,
      targetType: row.target_type,
      storeId: row.store_id,
      storeName: store?.name ?? "Mağaza",
      storeSlug: store?.slug ?? null,
      productId: row.product_id,
      productName: product?.name ?? null,
      status: row.status,
      requestedDays: Number(row.requested_days ?? 1),
      dailyPriceAmount: Number(row.daily_price_amount ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
      currency: row.currency || "AZN",
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      sellerNote: row.seller_note,
      adminNote: row.admin_note,
      requesterName: profile?.full_name ?? null,
      requesterEmail: profile?.email ?? null,
      createdAt: row.created_at,
    };
  });
}

export async function getPromotionRequestById(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("promotion_requests")
    .select(
      "id,requester_id,target_type,store_id,product_id,status,requested_days,daily_price_amount,total_amount,currency,starts_at,ends_at,seller_note,admin_note,created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const [request] = await hydratePromotionRows([data as PromotionRequestRow]);

  return request ?? null;
}

export async function getSellerPromotionRequests(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("promotion_requests")
    .select(
      "id,requester_id,target_type,store_id,product_id,status,requested_days,daily_price_amount,total_amount,currency,starts_at,ends_at,seller_note,admin_note,created_at",
    )
    .eq("requester_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  return hydratePromotionRows((data ?? []) as PromotionRequestRow[]);
}

export async function getAdminPromotionRequests() {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("promotion_requests")
    .select(
      "id,requester_id,target_type,store_id,product_id,status,requested_days,daily_price_amount,total_amount,currency,starts_at,ends_at,seller_note,admin_note,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(160);

  return hydratePromotionRows((data ?? []) as PromotionRequestRow[]);
}

export async function getActivePromotionMaps() {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data } = await (supabase as any)
    .from("promotion_requests")
    .select("target_type,store_id,product_id,ends_at")
    .eq("status", "approved")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  const promotedStoreIds = new Set<string>();
  const promotedProductIds = new Set<string>();

  for (const row of (data ?? []) as Array<{
    target_type: PromotionTargetType;
    store_id: string | null;
    product_id: string | null;
  }>) {
    if (row.target_type === "store" && row.store_id) {
      promotedStoreIds.add(row.store_id);
    }

    if (row.target_type === "product" && row.product_id) {
      promotedProductIds.add(row.product_id);
    }
  }

  return {
    promotedStoreIds,
    promotedProductIds,
  };
}
