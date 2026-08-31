import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PromoSellerSummary, SellerPromoCode } from "@/lib/promos/types";

function mapPromo(row: any, storeFallback?: { name?: string | null; slug?: string | null }): SellerPromoCode {
  const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;

  return {
    id: row.id,
    sellerId: row.seller_id,
    storeId: row.store_id ?? null,
    storeName: store?.name ?? storeFallback?.name ?? "Mağaza",
    storeSlug: store?.slug ?? storeFallback?.slug ?? "",
    code: row.code,
    discountPercent: Number(row.discount_percent ?? 0),
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? null,
    isActive: Boolean(row.is_active),
    promoNotificationSentAt: row.promo_notification_sent_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSellerPromoCodes(sellerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("seller_promo_codes")
    .select("id,seller_id,store_id,code,discount_percent,starts_at,ends_at,is_active,promo_notification_sent_at,created_at,updated_at,stores(name,slug)")
    .eq("seller_id", sellerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return ((data ?? []) as any[]).map((row) => mapPromo(row));
}

export async function getAdminPromoSellerList(): Promise<PromoSellerSummary[]> {
  const supabase = createSupabaseAdminClient();
  const [{ data: stores }, { data: promos }] = await Promise.all([
    (supabase as any)
      .from("stores")
      .select("id,name,slug,status,owner_id")
      .order("created_at", { ascending: false }),
    (supabase as any)
      .from("seller_promo_codes")
      .select("id,seller_id,code,is_active,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const promosBySeller = new Map<
    string,
    { activePromoCount: number; lastPromoCode: string | null; lastPromoCreatedAt: string | null }
  >();

  for (const promo of (promos ?? []) as any[]) {
    const current = promosBySeller.get(promo.seller_id) ?? {
      activePromoCount: 0,
      lastPromoCode: null,
      lastPromoCreatedAt: null,
    };

    if (promo.is_active) {
      current.activePromoCount += 1;
    }

    if (!current.lastPromoCreatedAt) {
      current.lastPromoCode = promo.code;
      current.lastPromoCreatedAt = promo.created_at;
    }

    promosBySeller.set(promo.seller_id, current);
  }

  return ((stores ?? []) as any[]).map((store) => {
    const promoSummary = promosBySeller.get(store.owner_id) ?? {
      activePromoCount: 0,
      lastPromoCode: null,
      lastPromoCreatedAt: null,
    };

    return {
      storeId: store.id,
      sellerId: store.owner_id,
      storeName: store.name ?? "Mağaza",
      storeSlug: store.slug ?? "",
      status: store.status ?? "draft",
      ...promoSummary,
    };
  });
}

export async function getAdminPromoCodesForStore(storeId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id,name,slug,owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (!store?.owner_id) {
    return {
      store: null,
      promos: [],
    };
  }

  const { data: promos } = await (supabase as any)
    .from("seller_promo_codes")
    .select("id,seller_id,store_id,code,discount_percent,starts_at,ends_at,is_active,promo_notification_sent_at,created_at,updated_at,stores(name,slug)")
    .eq("seller_id", store.owner_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return {
    store,
    promos: ((promos ?? []) as any[]).map((row) =>
      mapPromo(row, { name: store.name, slug: store.slug }),
    ),
  };
}
