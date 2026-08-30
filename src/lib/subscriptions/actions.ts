"use server";

import { revalidatePath } from "next/cache";

import { recordAdminAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionActionResult } from "@/lib/subscriptions/types";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));

  return Number.isFinite(value) ? value : 0;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readCurrency(formData: FormData) {
  const currency = readString(formData, "currency").toUpperCase();

  return /^[A-Z]{3}$/.test(currency) ? currency : "AZN";
}

function readBillingInterval(formData: FormData) {
  const interval = readString(formData, "billingInterval");

  return interval === "year" ? "year" : "month";
}

function readOptionalLimit(formData: FormData, key: string) {
  const rawValue = readString(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function revalidateSubscriptionPaths() {
  revalidatePath("/radmin/subscriptions");
  revalidatePath("/radmin/listing-limits");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/store/dashboard");
  revalidatePath("/store/dashboard/products");
}

export async function activateFreePlanAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  await requireRole(["seller"], "/store/dashboard");

  return {
    ok: false,
    message: "Abunəlik planı yalnız admin tərəfindən manual təyin olunur.",
  };
}

export async function createPlanAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  const current = await requireRole(["admin"], "/radmin/subscriptions");

  const name = readString(formData, "name");
  const rawSlug = readString(formData, "slug");
  const slug = slugify(rawSlug || name);
  const description = readString(formData, "description");
  const priceAmount = readNumber(formData, "priceAmount");
  const productLimit = readOptionalLimit(formData, "productLimit");
  const imagesPerProductLimit = readOptionalLimit(formData, "imagesPerProductLimit");
  const currency = readCurrency(formData);
  const billingInterval = readBillingInterval(formData);

  if (!name || !slug) {
    return {
      ok: false,
      message: "Plan adı və slug mütləqdir.",
    };
  }

  if (priceAmount < 0) {
    return {
      ok: false,
      message: "Qiymət mənfi ola bilməz.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await (supabaseAdmin as any).from("subscription_plans").insert({
    name,
    slug,
    description,
    price_amount: priceAmount,
    currency,
    billing_interval: billingInterval,
    features: [
      productLimit === null ? "Limitsiz məhsul" : `${productLimit} məhsul`,
      imagesPerProductLimit === null
        ? "Limitsiz şəkil"
        : `Məhsul başına ${imagesPerProductLimit} şəkil`,
    ],
    limits: {
      product_limit: productLimit,
      images_per_product_limit: imagesPerProductLimit,
    },
    is_active: true,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateSubscriptionPaths();
  await recordAdminAudit({
    adminId: current.user.id,
    action: "ADMIN_SUBSCRIPTION_PLAN_CREATE",
    entityType: "subscription_plans",
    entityId: null,
    metadata: { name, slug, product_limit: productLimit },
  });

  return {
    ok: true,
    message: "Plan yaradıldı.",
  };
}

export async function updatePlanAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  const current = await requireRole(["admin"], "/radmin/subscriptions");

  const planId = readString(formData, "planId");
  const name = readString(formData, "name");
  const rawSlug = readString(formData, "slug");
  const slug = slugify(rawSlug || name);
  const description = readString(formData, "description");
  const priceAmount = readNumber(formData, "priceAmount");
  const productLimit = readOptionalLimit(formData, "productLimit");
  const imagesPerProductLimit = readOptionalLimit(formData, "imagesPerProductLimit");
  const currency = readCurrency(formData);
  const billingInterval = readBillingInterval(formData);
  const isActive = readString(formData, "isActive") === "on";

  if (!planId || !name || !slug) {
    return {
      ok: false,
      message: "Plan ID, ad və slug mütləqdir.",
    };
  }

  if (priceAmount < 0) {
    return {
      ok: false,
      message: "Qiymət mənfi ola bilməz.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await (supabaseAdmin as any)
    .from("subscription_plans")
    .update({
      name,
      slug,
      description,
      price_amount: priceAmount,
      currency,
      billing_interval: billingInterval,
      features: [
        productLimit === null ? "Limitsiz məhsul" : `${productLimit} məhsul`,
        imagesPerProductLimit === null
          ? "Limitsiz şəkil"
          : `Məhsul başına ${imagesPerProductLimit} şəkil`,
      ],
      limits: {
        product_limit: productLimit,
        images_per_product_limit: imagesPerProductLimit,
      },
      is_active: isActive,
    })
    .eq("id", planId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateSubscriptionPaths();
  await recordAdminAudit({
    adminId: current.user.id,
    action: "ADMIN_SUBSCRIPTION_PLAN_UPDATE",
    entityType: "subscription_plans",
    entityId: planId,
    metadata: { name, slug, product_limit: productLimit },
  });

  return {
    ok: true,
    message: "Plan yeniləndi.",
  };
}

export async function assignStorePlanAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  const current = await requireRole(["admin"], "/radmin/subscriptions");
  const storeId = readString(formData, "storeId");
  const planId = readString(formData, "planId");
  const statusInput = readString(formData, "status");
  const status =
    statusInput === "inactive" || statusInput === "canceled"
      ? statusInput
      : "assigned";

  if (!storeId) {
    return {
      ok: false,
      message: "Mağaza seçimi mütləqdir.",
    };
  }

  if (status === "assigned" && !planId) {
    return {
      ok: false,
      message: "Plan seçimi mütləqdir.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: store } = await (supabaseAdmin as any)
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) {
    return {
      ok: false,
      message: "Mağaza tapılmadı.",
    };
  }

  if (status === "assigned") {
    const { data: plan } = await (supabaseAdmin as any)
      .from("subscription_plans")
      .select("id")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
      return {
        ok: false,
        message: "Plan tapılmadı.",
      };
    }
  }

  const now = new Date().toISOString();
  const replacementStatus = status === "canceled" ? "canceled" : "inactive";
  const { error: closeError } = await (supabaseAdmin as any)
    .from("subscriptions")
    .update({
      status: replacementStatus,
      canceled_at: status === "canceled" ? now : null,
    })
    .eq("store_id", storeId)
    .in("status", ["trialing", "active", "past_due", "assigned"]);

  if (closeError) {
    return {
      ok: false,
      message: closeError.message,
    };
  }

  if (status !== "assigned") {
    revalidateSubscriptionPaths();

    return {
      ok: true,
      message: "Abunəlik statusu yeniləndi.",
    };
  }

  const { error } = await (supabaseAdmin as any).from("subscriptions").insert({
    store_id: storeId,
    plan_id: planId,
    status: "assigned",
    starts_at: now,
    current_period_start: null,
    current_period_end: null,
    assigned_by: current.user.id,
    assigned_at: now,
    metadata: {
      assignment_mode: "manual",
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateSubscriptionPaths();
  await recordAdminAudit({
    adminId: current.user.id,
    action: "ADMIN_STORE_PLAN_ASSIGN",
    entityType: "store_subscriptions",
    entityId: storeId,
    metadata: { store_id: storeId, plan_id: planId, status },
  });

  return {
    ok: true,
    message: "Plan mağazaya manual təyin edildi.",
  };
}

export async function updateStoreProductLimitAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  const current = await requireRole(["admin"], "/radmin/listing-limits");

  const storeId = readString(formData, "storeId");
  const productLimitOverride = readOptionalLimit(formData, "productLimitOverride");

  if (!storeId) {
    return {
      ok: false,
      message: "Mağaza seçimi mütləqdir.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: store } = await (supabaseAdmin as any)
    .from("stores")
    .select("id,settings")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) {
    return {
      ok: false,
      message: "Mağaza tapılmadı.",
    };
  }

  const settings =
    store.settings && typeof store.settings === "object" && !Array.isArray(store.settings)
      ? { ...(store.settings as Record<string, unknown>) }
      : {};

  if (productLimitOverride === null) {
    delete settings.product_limit_override;
  } else {
    settings.product_limit_override = productLimitOverride;
  }

  const { error } = await (supabaseAdmin as any)
    .from("stores")
    .update({ settings })
    .eq("id", storeId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateSubscriptionPaths();
  await recordAdminAudit({
    adminId: current.user.id,
    action: "ADMIN_STORE_PRODUCT_LIMIT_UPDATE",
    entityType: "stores",
    entityId: storeId,
    metadata: { product_limit_override: productLimitOverride },
  });

  return {
    ok: true,
    message:
      productLimitOverride === null
        ? "Mağaza limiti global default-a qaytarıldı."
        : "Mağaza üçün fərdi elan limiti yeniləndi.",
  };
}
