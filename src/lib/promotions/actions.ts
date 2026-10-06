"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  invalidateHomepagePublicData,
  invalidateProductPublicData,
  invalidateStorePublicData,
} from "@/lib/cache/public-cache";
import { getOwnedStores } from "@/lib/dashboard/data";
import { getPromotionRequestById } from "@/lib/promotions/data";
import {
  notifyPromotionRequestResolved,
  notifyPromotionRequestSubmitted,
} from "@/lib/promotions/notifications";
import {
  promotionDailyPrices,
  type PromotionActionResult,
  type PromotionTargetType,
} from "@/lib/promotions/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readTargetType(value: string): PromotionTargetType | null {
  return value === "store" || value === "product" ? value : null;
}

function readRequestedDays(value: string) {
  const days = Number.parseInt(value, 10);

  if (!Number.isFinite(days)) {
    return 1;
  }

  return Math.min(Math.max(days, 1), 90);
}

function revalidatePromotionPaths(input?: {
  productId?: string | null;
  storeId?: string | null;
  storeSlug?: string | null;
}) {
  revalidatePath("/store/dashboard/promotions");
  revalidatePath("/radmin/promotions");
  revalidatePath("/admin/promotions");
  revalidatePath("/");
  revalidatePath("/products");
  invalidateHomepagePublicData();

  if (input?.storeId || input?.storeSlug) {
    invalidateStorePublicData({
      storeId: input.storeId,
      storeSlug: input.storeSlug,
    });
  }

  if (input?.productId) {
    invalidateProductPublicData({
      productId: input.productId,
      storeId: input.storeId,
      storeSlug: input.storeSlug,
      homepage: true,
    });
  }
}

export async function createPromotionRequestAction(
  formData: FormData,
): Promise<PromotionActionResult> {
  const current = await requireRole(["seller"], "/store/dashboard/promotions");
  const targetType = readTargetType(readString(formData, "targetType"));
  const storeId = readString(formData, "storeId");
  const productId = readString(formData, "productId");
  const requestedDays = readRequestedDays(readString(formData, "requestedDays"));
  const sellerNote = readString(formData, "sellerNote").slice(0, 600) || null;

  if (!targetType || !UUID_PATTERN.test(storeId)) {
    return {
      ok: false,
      message: "Mağaza və önə çıxarma tipi seçilməlidir.",
    };
  }

  if (targetType === "product" && !UUID_PATTERN.test(productId)) {
    return {
      ok: false,
      message: "Önə çıxarılacaq məhsulu seçin.",
    };
  }

  const stores = await getOwnedStores(current.user.id);
  const store = stores.find((item) => item.id === storeId);

  if (!store) {
    return {
      ok: false,
      message: "Bu mağaza sizə aid deyil.",
    };
  }

  const supabase = createSupabaseAdminClient();
  let productName: string | null = null;

  if (targetType === "product") {
    const { data: product } = await (supabase as any)
      .from("products")
      .select("id,name")
      .eq("id", productId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!product) {
      return {
        ok: false,
        message: "Bu məhsul seçilən mağazaya aid deyil.",
      };
    }

    productName = product.name ?? "Məhsul";
  }

  const duplicateQuery = (supabase as any)
    .from("promotion_requests")
    .select("id")
    .eq("requester_id", current.user.id)
    .eq("target_type", targetType)
    .eq("store_id", storeId)
    .eq("status", "pending")
    .limit(1);
  const { data: duplicate, error: duplicateError } =
    targetType === "product"
      ? await duplicateQuery.eq("product_id", productId)
      : await duplicateQuery.is("product_id", null);

  if (duplicateError) {
    return { ok: false, message: ["42P01", "PGRST205"].includes(duplicateError.code)
      ? "Önə çıxarma sistemi hazır deyil. Administrator promotion_requests SQL faylını tətbiq etməlidir."
      : "Gözləyən sorğular yoxlanmadı. Yenidən cəhd edin." };
  }

  if ((duplicate ?? []).length > 0) {
    return {
      ok: false,
      message: "Bu seçim üçün artıq gözləyən sorğu var.",
    };
  }

  const dailyPrice = promotionDailyPrices[targetType];
  const totalAmount = dailyPrice * requestedDays;
  const { data, error } = await (supabase as any)
    .from("promotion_requests")
    .insert({
      requester_id: current.user.id,
      target_type: targetType,
      store_id: storeId,
      product_id: targetType === "product" ? productId : null,
      requested_days: requestedDays,
      daily_price_amount: dailyPrice,
      total_amount: totalAmount,
      currency: "AZN",
      seller_note: sellerNote,
      metadata: {
        product_name: productName,
      },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return {
      ok: false,
      message: error?.message ?? "Sorğu yaradılmadı.",
    };
  }

  const notification = await notifyPromotionRequestSubmitted({
    id: data.id, requesterId: current.user.id, targetType, storeId,
    storeName: store.name, storeSlug: store.slug, productId: targetType === "product" ? productId : null,
    productName, status: "pending", requestedDays, dailyPriceAmount: dailyPrice, totalAmount,
    currency: "AZN", startsAt: null, endsAt: null, sellerNote, adminNote: null,
    requesterName: current.profile?.full_name ?? null, requesterEmail: current.user.email ?? null,
    createdAt: new Date().toISOString(),
  });

  revalidatePromotionPaths({
    storeId,
    storeSlug: store.slug,
    productId: targetType === "product" ? productId : null,
  });

  return {
    ok: true,
    message: notification.telegramSent
      ? "Sorğu RAdminə və Telegrama göndərildi. Ödəniş təsdiqindən sonra aktiv olacaq."
      : "Sorğu RAdminə göndərildi. Telegram bildirişi çatdırılmadı; sorğu admin panelində saxlanılıb.",
  };
}

async function resolvePromotionTarget(input: {
  targetType: PromotionTargetType;
  storeId: string;
  productId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id,name,slug,owner_id")
    .eq("id", input.storeId)
    .maybeSingle();

  if (!store) {
    return {
      ok: false as const,
      message: "Mağaza tapılmadı.",
    };
  }

  if (input.targetType === "store") {
    return {
      ok: true as const,
      store: store as { id: string; name: string; slug: string | null; owner_id: string | null },
      product: null,
    };
  }

  if (!UUID_PATTERN.test(input.productId)) {
    return {
      ok: false as const,
      message: "Məhsul seçilməlidir.",
    };
  }

  const { data: product } = await (supabase as any)
    .from("products")
    .select("id,name,store_id")
    .eq("id", input.productId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (!product) {
    return {
      ok: false as const,
      message: "Məhsul bu mağazaya aid deyil.",
    };
  }

  return {
    ok: true as const,
    store: store as { id: string; name: string; slug: string | null; owner_id: string | null },
    product: product as { id: string; name: string | null; store_id: string },
  };
}

export async function createAdminPromotionAction(
  formData: FormData,
): Promise<PromotionActionResult> {
  const current = await requireRole(["admin"], "/radmin/promotions");
  const targetType = readTargetType(readString(formData, "targetType"));
  const storeId = readString(formData, "storeId");
  const productId = readString(formData, "productId");
  const adminNote = readString(formData, "adminNote").slice(0, 600) || null;

  if (!targetType || !UUID_PATTERN.test(storeId)) {
    return {
      ok: false,
      message: "Mağaza və tip seçilməlidir.",
    };
  }

  const resolved = await resolvePromotionTarget({ targetType, storeId, productId });

  if (!resolved.ok) {
    return {
      ok: false,
      message: resolved.message,
    };
  }

  const supabase = createSupabaseAdminClient();
  let activeQuery = (supabase as any)
    .from("promotion_requests")
    .select("id")
    .eq("target_type", targetType)
    .eq("store_id", storeId)
    .eq("status", "approved")
    .limit(1);

  activeQuery =
    targetType === "product"
      ? activeQuery.eq("product_id", resolved.product!.id)
      : activeQuery.is("product_id", null);

  const { data: existing } = await activeQuery;

  if ((existing ?? []).length > 0) {
    return {
      ok: false,
      message: "Bu seçim artıq önə çıxarılıb.",
    };
  }

  const startsAt = new Date();
  const requesterId = resolved.store.owner_id || current.user.id;
  const { data, error } = await (supabase as any)
    .from("promotion_requests")
    .insert({
      requester_id: requesterId,
      target_type: targetType,
      store_id: storeId,
      product_id: targetType === "product" ? resolved.product!.id : null,
      status: "approved",
      requested_days: 1,
      daily_price_amount: 0,
      total_amount: 0,
      currency: "AZN",
      starts_at: startsAt.toISOString(),
      ends_at: null,
      approved_by: current.user.id,
      approved_at: startsAt.toISOString(),
      admin_note: adminNote || "RAdmin tərəfindən ömürlük önə çıxarıldı.",
      metadata: {
        source: "radmin_lifetime",
        lifetime: true,
        product_name: resolved.product?.name ?? null,
      },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return {
      ok: false,
      message: error?.message ?? "Önə çıxarma aktiv edilmədi.",
    };
  }

  const request = await getPromotionRequestById(data.id);

  if (request) {
    await notifyPromotionRequestResolved(request);
    revalidatePromotionPaths({
      productId: request.productId,
      storeId: request.storeId,
      storeSlug: request.storeSlug,
    });
  }

  return {
    ok: true,
    message: "Ömürlük önə çıxarma aktiv edildi.",
  };
}

export async function approvePromotionRequestAction(
  formData: FormData,
): Promise<PromotionActionResult> {
  const current = await requireRole(["admin"], "/radmin/promotions");
  const requestId = readString(formData, "requestId");
  const adminNote = readString(formData, "adminNote").slice(0, 600) || null;

  if (!UUID_PATTERN.test(requestId)) {
    return {
      ok: false,
      message: "Sorğu tapılmadı.",
    };
  }

  const request = await getPromotionRequestById(requestId);

  if (!request) {
    return {
      ok: false,
      message: "Sorğu tapılmadı.",
    };
  }

  if (request.status !== "pending") {
    return {
      ok: false,
      message: "Yalnız gözləyən sorğular təsdiqlənə bilər.",
    };
  }

  const startsAt = new Date();
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("promotion_requests")
    .update({
      status: "approved",
      starts_at: startsAt.toISOString(),
      ends_at: null,
      approved_by: current.user.id,
      approved_at: startsAt.toISOString(),
      admin_note: adminNote || "Admin təsdiqi ilə ömürlük aktiv edildi.",
    })
    .eq("id", requestId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const updated = await getPromotionRequestById(requestId);

  if (updated) {
    await notifyPromotionRequestResolved(updated);
    revalidatePromotionPaths({
      productId: updated.productId,
      storeId: updated.storeId,
      storeSlug: updated.storeSlug,
    });
  }

  return {
    ok: true,
    message: "Önə çıxarma ömürlük aktiv edildi.",
  };
}

export async function cancelPromotionRequestAction(
  formData: FormData,
): Promise<PromotionActionResult> {
  await requireRole(["admin"], "/radmin/promotions");
  const requestId = readString(formData, "requestId");
  const adminNote = readString(formData, "adminNote").slice(0, 600) || null;

  if (!UUID_PATTERN.test(requestId)) {
    return {
      ok: false,
      message: "Sorğu tapılmadı.",
    };
  }

  const currentRequest = await getPromotionRequestById(requestId);
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("promotion_requests")
    .update({
      status: "canceled",
      ends_at: new Date().toISOString(),
      admin_note: adminNote || "RAdmin tərəfindən ləğv edildi.",
    })
    .eq("id", requestId)
    .eq("status", "approved");

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePromotionPaths({
    productId: currentRequest?.productId,
    storeId: currentRequest?.storeId,
    storeSlug: currentRequest?.storeSlug,
  });

  return {
    ok: true,
    message: "Önə çıxarma ləğv edildi.",
  };
}

export async function rejectPromotionRequestAction(
  formData: FormData,
): Promise<PromotionActionResult> {
  await requireRole(["admin"], "/radmin/promotions");
  const requestId = readString(formData, "requestId");
  const adminNote = readString(formData, "adminNote").slice(0, 600) || null;

  if (!UUID_PATTERN.test(requestId)) {
    return {
      ok: false,
      message: "Sorğu tapılmadı.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("promotion_requests")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      admin_note: adminNote,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const updated = await getPromotionRequestById(requestId);

  if (updated) {
    await notifyPromotionRequestResolved(updated);
  }

  revalidatePromotionPaths();

  return {
    ok: true,
    message: "Sorğu rədd edildi.",
  };
}
