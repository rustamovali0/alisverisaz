"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  invalidateHomepagePublicData,
  invalidateProductPublicData,
  invalidateStorePublicData,
} from "@/lib/cache/public-cache";
import { getOwnedStores } from "@/lib/dashboard/data";
import {
  getPromotionRequestById,
} from "@/lib/promotions/data";
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
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
  const { data: duplicate } =
    targetType === "product"
      ? await duplicateQuery.eq("product_id", productId)
      : await duplicateQuery.is("product_id", null);

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

  const request = await getPromotionRequestById(data.id);

  if (request) {
    await notifyPromotionRequestSubmitted(request);
  }

  revalidatePromotionPaths({
    storeId,
    storeSlug: store.slug,
    productId: targetType === "product" ? productId : null,
  });

  return {
    ok: true,
    message: "Sorğu göndərildi. Admin ödənişi təsdiqlədikdən sonra aktiv olacaq.",
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
  const endsAt = addDays(startsAt, request.requestedDays);
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("promotion_requests")
    .update({
      status: "approved",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      approved_by: current.user.id,
      approved_at: startsAt.toISOString(),
      admin_note: adminNote,
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
    message: "Önə çıxarma aktiv edildi.",
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
