"use server";

import { revalidatePath } from "next/cache";

import { recordAdminAudit } from "@/lib/admin/audit";
import { ensureAuthProfile } from "@/lib/auth/profiles";
import { getCurrentUserProfile, requireRole } from "@/lib/auth/session";
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

  if (!current) {
    return {
      ok: false,
      message: "Rəy yazmaq üçün əvvəlcə daxil olun.",
    };
  }

  if (current.role !== "customer" && current.role !== "seller") {
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

  await ensureAuthProfile({
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
  if (store?.owner_id === current.user.id) {
    return {
      ok: false,
      message: "Öz məhsulunuza rəy yaza bilməzsiniz.",
    };
  }
  const resolvedStoreSlug =
    typeof store?.slug === "string" && store.slug ? store.slug : storeSlug;

  const { error } = await (supabase as any)
    .from("reviews")
    .upsert(
      {
        product_id: productId,
        user_id: current.user.id,
        rating,
        comment: comment.slice(0, 2000) || null,
        status: "approved",
      },
      {
        onConflict: "product_id,user_id",
      },
    );

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "Rəy cədvəlində təkrar rəy məhdudiyyəti hələ silinməyib. Reviews SQL migration işlədin."
          : error.message,
    };
  }

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
