"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { getAnalyticsRangeDates, type AnalyticsRange } from "@/lib/analytics/ranges";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ViewSource = "normal" | "share" | "direct";
type DeleteScope = "all" | "product_views" | "store_views" | "link_views";

function cleanVisitorId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function normalizeSource(value?: string | null): ViewSource {
  return value === "share" || value === "direct" ? value : "normal";
}

export async function trackProductViewAction(input: {
  productId: string;
  visitorId: string;
  source?: string | null;
}) {
  const visitorId = cleanVisitorId(input.visitorId);

  if (!input.productId || !visitorId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product } = await (admin as any)
    .from("products")
    .select("id,owner_id,store_id")
    .eq("id", input.productId)
    .maybeSingle();

  if (!product?.owner_id) {
    return;
  }

  await (admin as any).from("product_views").insert({
    product_id: product.id,
    seller_id: product.owner_id,
    visitor_id: user?.id ? null : visitorId,
    user_id: user?.id ?? null,
    source: normalizeSource(input.source),
  });
}

export async function trackStoreViewAction(input: {
  storeId: string;
  visitorId: string;
  source?: string | null;
}) {
  const visitorId = cleanVisitorId(input.visitorId);

  if (!input.storeId || !visitorId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: store } = await (admin as any)
    .from("stores")
    .select("id,owner_id")
    .eq("id", input.storeId)
    .maybeSingle();

  if (!store?.owner_id) {
    return;
  }

  await (admin as any).from("store_views").insert({
    store_id: store.id,
    seller_id: store.owner_id,
    visitor_id: user?.id ? null : visitorId,
    user_id: user?.id ?? null,
    source: normalizeSource(input.source),
  });
}

function applyDeleteRange(query: any, range: AnalyticsRange) {
  const { from, to } = getAnalyticsRangeDates(range);
  let next = query;

  if (from) {
    next = next.gte("viewed_at", from);
  }

  if (to) {
    next = next.lt("viewed_at", to);
  }

  return next;
}

export async function deleteSellerAnalyticsAction(input: {
  scope: DeleteScope;
  range: AnalyticsRange;
}) {
  const current = await requireRole(["seller"], "/store/dashboard/analytics");
  const admin = createSupabaseAdminClient();
  const scope = input.scope;
  const range = input.range;

  const deleteProductViews = scope === "all" || scope === "product_views" || scope === "link_views";
  const deleteStoreViews = scope === "all" || scope === "store_views" || scope === "link_views";
  let deleted = 0;

  if (deleteProductViews) {
    let query = (admin as any)
      .from("product_views")
      .delete({ count: "exact" })
      .eq("seller_id", current.user.id);

    if (scope === "link_views") {
      query = query.eq("source", "share");
    }

    const { count, error } = await applyDeleteRange(query, range);

    if (error) {
      return { ok: false, message: "Məlumatları silmək mümkün olmadı. Yenidən cəhd edin." };
    }

    deleted += count ?? 0;
  }

  if (deleteStoreViews) {
    let query = (admin as any)
      .from("store_views")
      .delete({ count: "exact" })
      .eq("seller_id", current.user.id);

    if (scope === "link_views") {
      query = query.eq("source", "share");
    }

    const { count, error } = await applyDeleteRange(query, range);

    if (error) {
      return { ok: false, message: "Məlumatları silmək mümkün olmadı. Yenidən cəhd edin." };
    }

    deleted += count ?? 0;
  }

  await (admin as any).from("activity_events").insert({
    event_type: "analytics_deleted",
    actor_id: current.user.id,
    metadata: {
      title: "Analitika silindi",
      description: `${deleted} qeyd silindi`,
      scope,
      range,
      deleted,
    },
  });

  revalidatePath("/store/dashboard/analytics");
  revalidatePath("/admin/analytics");
  revalidatePath("/radmin/activity");

  return { ok: true, message: "Məlumatlar uğurla silindi." };
}
