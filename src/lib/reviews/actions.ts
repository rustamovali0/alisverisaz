"use server";

import { revalidatePath } from "next/cache";

import { ensureAuthProfile } from "@/lib/auth/profiles";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { hasUserPurchasedProduct } from "@/lib/reviews/data";
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

  if (current.role !== "customer") {
    return {
      ok: false,
      message: "Rəy yazmaq yalnız istifadəçi hesabı üçün aktivdir.",
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
    .select("id,slug,stores(slug)")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (productError || !product) {
    return {
      ok: false,
      message: productError?.message ?? "Məhsul tapılmadı.",
    };
  }

  const hasPurchased = await hasUserPurchasedProduct({
    userId: current.user.id,
    productId,
  });

  if (!hasPurchased) {
    return {
      ok: false,
      message: "Rəy yazmaq üçün əvvəlcə bu məhsulu sifariş etməlisiniz.",
    };
  }

  const store = Array.isArray(product.stores) ? product.stores[0] : product.stores;
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
