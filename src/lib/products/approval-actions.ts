"use server";

import { revalidatePath } from "next/cache";

import { recordAdminAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { invalidateProductPublicData } from "@/lib/cache/public-cache";
import {
  sendProductRejectedEmail,
  sendProductSubmittedEmail,
} from "@/lib/email/product-approval";
import { getProductApprovalSettings } from "@/lib/products/approval-settings";
import { deleteR2ImagesByUrls } from "@/lib/storage/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProductApprovalActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const DEFAULT_REJECTION_MESSAGE =
  "Məhsulunuz təsdiqlənmədi. Zəhmət olmasa məlumatları yoxlayıb yenidən göndərin.";
const DEFAULT_DELETE_MESSAGE = "Məhsulunuz təsdiq olunmadı və silindi.";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function normalizeMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function getPendingProduct(productId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("products")
    .select(
      "id,name,status,metadata,store_id,category_id,owner_id,product_images(url),stores(id,name,slug,owner_id)",
    )
    .eq("id", productId)
    .eq("listing_type", "store")
    .maybeSingle();

  if (!data || normalizeMetadata(data.metadata).approval_status !== "pending") {
    return null;
  }

  const store = firstRow(data.stores);
  const ownerId = (data.owner_id as string | null) ?? (store?.owner_id as string | null) ?? null;
  const { data: seller } = ownerId
    ? await supabase
        .from("profiles")
        .select("id,email,full_name")
        .eq("id", ownerId)
        .maybeSingle()
    : { data: null };

  return {
    id: data.id as string,
    name: data.name as string,
    metadata: normalizeMetadata(data.metadata),
    storeId: data.store_id as string,
    categoryId: (data.category_id as string | null) ?? null,
    ownerId,
    storeSlug: (store?.slug as string | null) ?? null,
    sellerName: (seller?.full_name as string | null) ?? (seller?.email as string | null) ?? "Satıcı",
    sellerEmail: (seller?.email as string | null) ?? null,
    imageUrls: ((data.product_images ?? []) as Array<{ url?: string | null }>)
      .map((image) => image.url)
      .filter((url): url is string => Boolean(url)),
  };
}

async function notifySeller(input: {
  userId: string | null;
  type: string;
  title: string;
  body: string;
  productId: string;
}) {
  if (!input.userId) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  await (supabase as any).from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: {
      source: "product_approval",
      product_id: input.productId,
    },
  });
}

export async function updateProductApprovalSettingsAction(
  formData: FormData,
): Promise<ProductApprovalActionResult> {
  const current = await requireRole(["admin"], "/radmin/new-products");
  const requireApproval = readString(formData, "requireApproval") === "on";
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any).from("platform_settings").upsert({
    key: "product_approval",
    value: {
      require_approval: requireApproval,
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await recordAdminAudit({
    adminId: current.user.id,
    action: "update_product_approval_settings",
    entityType: "platform_settings",
    entityId: "product_approval",
    metadata: {
      require_approval: requireApproval,
    },
  });
  revalidatePath("/radmin/new-products");

  return {
    ok: true,
    message: requireApproval
      ? "Yeni məhsullar admin təsdiqindən sonra dərc olunacaq."
      : "Yeni məhsullar təsdiqsiz dərc olunacaq.",
  };
}

export async function approveProductAction(
  formData: FormData,
): Promise<ProductApprovalActionResult> {
  const current = await requireRole(["admin"], "/radmin/new-products");
  const productId = readString(formData, "productId");

  if (!productId) {
    return { ok: false, message: "Məhsul ID tapılmadı." };
  }

  const product = await getPendingProduct(productId);

  if (!product) {
    return { ok: false, message: "Təsdiq gözləyən məhsul tapılmadı." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("products")
    .update({
      status: "active",
      metadata: {
        ...product.metadata,
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: current.user.id,
        rejection_note: null,
      },
    })
    .eq("id", product.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await notifySeller({
    userId: product.ownerId,
    type: "product_approved",
    title: "Məhsul təsdiqləndi",
    body: `${product.name} məhsulunuz təsdiqləndi və dərc olundu.`,
    productId: product.id,
  });
  await recordAdminAudit({
    adminId: current.user.id,
    action: "approve_product",
    entityType: "products",
    entityId: product.id,
    metadata: {
      product_name: product.name,
    },
  });
  revalidateProductApprovalPaths(product);

  return {
    ok: true,
    message: "Məhsul təsdiqləndi və dərc olundu.",
  };
}

export async function rejectProductAction(
  formData: FormData,
): Promise<ProductApprovalActionResult> {
  const current = await requireRole(["admin"], "/radmin/new-products");
  const productId = readString(formData, "productId");
  const note = readString(formData, "note") || DEFAULT_REJECTION_MESSAGE;

  if (!productId) {
    return { ok: false, message: "Məhsul ID tapılmadı." };
  }

  const product = await getPendingProduct(productId);

  if (!product) {
    return { ok: false, message: "Təsdiq gözləyən məhsul tapılmadı." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("products")
    .update({
      status: "draft",
      metadata: {
        ...product.metadata,
        approval_status: "rejected",
        rejection_note: note,
        rejected_at: new Date().toISOString(),
        rejected_by: current.user.id,
      },
    })
    .eq("id", product.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await notifySeller({
    userId: product.ownerId,
    type: "product_rejected",
    title: "Məhsul rədd edildi",
    body: note,
    productId: product.id,
  });
  if (product.sellerEmail) {
    try {
      await sendProductRejectedEmail({
        to: product.sellerEmail,
        sellerName: product.sellerName,
        productName: product.name,
        message: note,
      });
    } catch (error) {
      console.error("Product rejection email failed", {
        productId: product.id,
        error,
      });
    }
  }
  await recordAdminAudit({
    adminId: current.user.id,
    action: "reject_product",
    entityType: "products",
    entityId: product.id,
    metadata: {
      product_name: product.name,
      note,
    },
  });
  revalidateProductApprovalPaths(product);

  return {
    ok: true,
    message: "Məhsul rədd edildi və satıcıya bildiriş göndərildi.",
  };
}

export async function deletePendingProductAction(
  formData: FormData,
): Promise<ProductApprovalActionResult> {
  const current = await requireRole(["admin"], "/radmin/new-products");
  const productId = readString(formData, "productId");

  if (!productId) {
    return { ok: false, message: "Məhsul ID tapılmadı." };
  }

  const product = await getPendingProduct(productId);

  if (!product) {
    return { ok: false, message: "Təsdiq gözləyən məhsul tapılmadı." };
  }

  const supabase = createSupabaseAdminClient();
  await deleteR2ImagesByUrls(product.imageUrls);
  const { error } = await (supabase as any).from("products").delete().eq("id", product.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await notifySeller({
    userId: product.ownerId,
    type: "product_deleted_by_admin",
    title: "Məhsul silindi",
    body: DEFAULT_DELETE_MESSAGE,
    productId: product.id,
  });
  await recordAdminAudit({
    adminId: current.user.id,
    action: "delete_pending_product",
    entityType: "products",
    entityId: product.id,
    metadata: {
      product_name: product.name,
    },
  });
  revalidateProductApprovalPaths(product);

  return {
    ok: true,
    message: "Məhsul silindi və satıcıya bildiriş göndərildi.",
  };
}

export async function notifyProductSubmitted(input: {
  sellerId: string;
  sellerName: string;
  sellerEmail: string | null;
  productId: string;
  productName: string;
}) {
  await notifySeller({
    userId: input.sellerId,
    type: "product_pending_review",
    title: "Məhsul təsdiqə göndərildi",
    body: "Məhsul əlavə edildi, qəbul edildikdən sonra dərc olunacaq.",
    productId: input.productId,
  });

  if (!input.sellerEmail) {
    return;
  }

  try {
    await sendProductSubmittedEmail({
      to: input.sellerEmail,
      sellerName: input.sellerName,
      productName: input.productName,
    });
  } catch (error) {
    console.error("Product submitted email failed", {
      productId: input.productId,
      error,
    });
  }
}

function revalidateProductApprovalPaths(product: {
  id: string;
  storeId: string;
  categoryId: string | null;
  storeSlug: string | null;
}) {
  revalidatePath("/radmin/new-products");
  revalidatePath("/radmin/products");
  revalidatePath("/radmin/stores");
  revalidatePath("/store/dashboard/products");
  revalidatePath("/store/dashboard/pending-products");
  invalidateProductPublicData({
    productId: product.id,
    storeId: product.storeId,
    categoryId: product.categoryId,
    storeSlug: product.storeSlug,
    homepage: true,
  });
}
