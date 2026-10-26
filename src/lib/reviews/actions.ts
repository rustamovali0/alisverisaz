"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { recordAdminAudit } from "@/lib/admin/audit";
import { ensureAuthProfile } from "@/lib/auth/profiles";
import { getCurrentUserProfile, requireRole } from "@/lib/auth/session";
import { assertAuthRateLimit, getClientIp, recordAuthRateLimitAttempt } from "@/lib/auth/security";
import { getStoreSubdomainSlug } from "@/lib/config/domains";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readRating(formData: FormData) {
  const rating = Number(readString(formData, "rating"));

  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

async function getReviewProductPath(reviewId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: review } = await (supabase as any)
    .from("reviews")
    .select("id,products(id,slug,stores(slug))")
    .eq("id", reviewId)
    .maybeSingle();

  const product = Array.isArray(review?.products) ? review.products[0] : review?.products;
  const store = Array.isArray(product?.stores) ? product.stores[0] : product?.stores;

  return {
    productId: typeof product?.id === "string" ? product.id : null,
    productSlug: typeof product?.slug === "string" ? product.slug : null,
    storeSlug: typeof store?.slug === "string" ? store.slug : null,
  };
}

function revalidateReviewPaths(input: {
  productId?: string | null;
  productSlug?: string | null;
  storeSlug?: string | null;
}) {
  revalidatePath("/radmin/reviews");

  if (!input.storeSlug) {
    return;
  }

  if (input.productId) {
    revalidatePath(`/${input.storeSlug}/products/${input.productId}`);
  }

  if (input.productSlug) {
    revalidatePath(`/${input.storeSlug}/products/${input.productSlug}`);
  }
}

export async function upsertProductReviewAction(
  formData: FormData,
): Promise<ActionResult> {
  const current = await getCurrentUserProfile();
  const productId = readString(formData, "productId");
  const storeSlug = readString(formData, "storeSlug");
  const rating = Number(readString(formData, "rating"));
  const comment = readString(formData, "comment");
  const guestToken = readString(formData, "guestToken");
  const guestName = readString(formData, "guestName").slice(0, 80);
  const requestHeaders = await headers();
  const hostStoreSlug = getStoreSubdomainSlug(requestHeaders.get("host"));
  const requestPath = requestHeaders.get("x-current-path") || requestHeaders.get("next-url") || (() => {
    try { return new URL(requestHeaders.get("referer") ?? "").pathname; } catch { return ""; }
  })();
  const isGuest = !current;

  const isIsolatedRequest = hostStoreSlug === storeSlug || requestPath === `/${storeSlug}` || requestPath.startsWith(`/${storeSlug}/`);
  if (isGuest && (!isIsolatedRequest || guestToken.length < 16 || guestToken.length > 200 || guestName.length < 2)) {
    return { ok: false, message: "Adınızı düzgün yazın və səhifəni yenidən açıb cəhd edin." };
  }

  if (current && current.role !== "customer" && current.role !== "seller") {
    return {
      ok: false,
      message: "Rəy yazmaq üçün alıcı və ya satıcı hesabı ilə daxil olun.",
    };
  }

  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return {
      ok: false,
      message: "Məhsul və 1-5 arası ulduz seçimi mütləqdir.",
    };
  }

  if (current) await ensureAuthProfile({
    id: current.user.id,
    email: current.user.email ?? null,
    fullName: current.profile?.full_name ?? null,
    role: current.role,
  });

  const supabase = createSupabaseAdminClient();
  const { data: product, error: productError } = await (supabase as any)
    .from("products")
    .select("id,slug,stores(slug,owner_id)")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (productError || !product) {
    return {
      ok: false,
      message: productError?.message ?? "Məhsul tapılmadı.",
    };
  }

  const store = Array.isArray(product.stores) ? product.stores[0] : product.stores;
  if (current && store?.owner_id === current.user.id) {
    return {
      ok: false,
      message: "Öz məhsulunuza rəy yaza bilməzsiniz.",
    };
  }
  const resolvedStoreSlug =
    typeof store?.slug === "string" && store.slug ? store.slug : storeSlug;

  if (isGuest && !(hostStoreSlug === resolvedStoreSlug || requestPath === `/${resolvedStoreSlug}` || requestPath.startsWith(`/${resolvedStoreSlug}/`))) {
    return { ok: false, message: "Qonaq rəyi yalnız mağazanın şəxsi saytından yazıla bilər." };
  }
  const guestKey = isGuest ? createHash("sha256").update(guestToken).digest("hex") : null;
  const ip = await getClientIp();
  const rateRule = { endpoint: "support_message" as const, identifier: `review:${productId}:${guestKey ?? current?.user.id}`, ip, maxAttempts: 5, windowSeconds: 3600, blockSeconds: 3600 };
  const rateLimit = await assertAuthRateLimit(rateRule);
  if (!rateLimit.ok) return { ok: false, message: rateLimit.message };
  if (isGuest) {
    const { data: existing } = await (supabase as any).from("reviews").select("id").eq("product_id", productId).eq("guest_key", guestKey).maybeSingle();
    if (existing) return { ok: false, message: "Bu məhsula artıq bir dəfə rəy yazmısınız." };
  }

  const reviewPayload =
      {
        product_id: productId,
        user_id: current?.user.id ?? null,
        guest_key: guestKey,
        guest_name: isGuest ? guestName : null,
        rating,
        comment: comment.slice(0, 2000) || null,
        status: "approved",
      };
  const { error } = isGuest
    ? await (supabase as any).from("reviews").insert(reviewPayload)
    : await (supabase as any).from("reviews").upsert(reviewPayload,
      {
        onConflict: "product_id,user_id",
      },
    );

  if (error) {
    await recordAuthRateLimitAttempt(rateRule);
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "Bu məhsula artıq bir dəfə rəy yazmısınız."
          : "Rəy saxlanmadı. Bir az sonra yenidən cəhd edin.",
    };
  }

  await recordAuthRateLimitAttempt(rateRule);

  if (resolvedStoreSlug) {
    revalidatePath(`/${resolvedStoreSlug}/products/${productId}`);
    if (typeof product.slug === "string" && product.slug) {
      revalidatePath(`/${resolvedStoreSlug}/products/${product.slug}`);
    }
  }

  revalidatePath("/radmin/reviews");

  return {
    ok: true,
    message: "Dəyərləndirmə saxlandı.",
  };
}

export async function deleteProductReviewAction(
  reviewId: string,
  productId: string,
  storeSlug: string,
): Promise<ActionResult> {
  const current = await getCurrentUserProfile();

  if (!current) {
    return {
      ok: false,
      message: "Rəy silmək üçün əvvəlcə daxil olun.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: review } = await (supabase as any)
    .from("reviews")
    .select("id,user_id,products(id,slug,stores(slug))")
    .eq("id", reviewId)
    .eq("product_id", productId)
    .maybeSingle();

  if (!review || review.user_id !== current.user.id) {
    return {
      ok: false,
      message: "Bu rəy üzərində icazəniz yoxdur.",
    };
  }

  const { error } = await (supabase as any)
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", current.user.id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const product = Array.isArray(review.products) ? review.products[0] : review.products;
  const store = Array.isArray(product?.stores) ? product?.stores[0] : product?.stores;
  const resolvedStoreSlug =
    typeof store?.slug === "string" && store.slug ? store.slug : storeSlug;

  if (resolvedStoreSlug) {
    revalidatePath(`/${resolvedStoreSlug}/products/${productId}`);
    if (typeof product?.slug === "string" && product.slug) {
      revalidatePath(`/${resolvedStoreSlug}/products/${product.slug}`);
    }
  }

  revalidatePath("/radmin/reviews");

  return {
    ok: true,
    message: "Rəy silindi.",
  };
}

export async function updateAdminProductReviewAction(
  formData: FormData,
): Promise<ActionResult> {
  const current = await requireRole(["admin"], "/radmin/reviews");
  const reviewId = readString(formData, "reviewId");
  const rating = readRating(formData);
  const comment = readString(formData, "comment").slice(0, 2000);
  const status = readString(formData, "status");

  if (!reviewId || !rating || !["pending", "approved", "rejected", "archived"].includes(status)) {
    return {
      ok: false,
      message: "Rəy məlumatları düzgün deyil.",
    };
  }

  const paths = await getReviewProductPath(reviewId);
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("reviews")
    .update({
      rating,
      comment: comment || null,
      status,
    })
    .eq("id", reviewId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  void recordAdminAudit({
    adminId: current.user.id,
    action: "REVIEW_UPDATED",
    entityType: "reviews",
    entityId: reviewId,
    metadata: {
      rating,
      status,
    },
  });
  revalidateReviewPaths(paths);

  return {
    ok: true,
    message: "Rəy yeniləndi.",
  };
}

export async function archiveAdminProductReviewAction(
  reviewId: string,
): Promise<ActionResult> {
  const current = await requireRole(["admin"], "/radmin/reviews");

  if (!reviewId) {
    return {
      ok: false,
      message: "Rəy tapılmadı.",
    };
  }

  const paths = await getReviewProductPath(reviewId);
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("reviews")
    .update({ status: "archived" })
    .eq("id", reviewId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  void recordAdminAudit({
    adminId: current.user.id,
    action: "REVIEW_ARCHIVED",
    entityType: "reviews",
    entityId: reviewId,
  });
  revalidateReviewPaths(paths);

  return {
    ok: true,
    message: "Rəy arxivləndi.",
  };
}

export async function deleteAdminProductReviewAction(
  reviewId: string,
): Promise<ActionResult> {
  const current = await requireRole(["admin"], "/radmin/reviews");

  if (!reviewId) {
    return {
      ok: false,
      message: "Rəy tapılmadı.",
    };
  }

  const paths = await getReviewProductPath(reviewId);
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("reviews")
    .delete()
    .eq("id", reviewId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  void recordAdminAudit({
    adminId: current.user.id,
    action: "REVIEW_DELETED",
    entityType: "reviews",
    entityId: reviewId,
  });
  revalidateReviewPaths(paths);

  return {
    ok: true,
    message: "Rəy silindi.",
  };
}
