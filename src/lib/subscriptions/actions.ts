"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SubscriptionActionResult } from "@/lib/subscriptions/types";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));

  return Number.isFinite(value) ? value : 0;
}

function addOneMonth(date: Date) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);

  return next;
}

export async function activatePlanPlaceholderAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  const current = await requireRole(["seller"], "/store/dashboard/subscription");
  const storeId = readString(formData, "storeId");
  const planId = readString(formData, "planId");

  if (!storeId || !planId) {
    return {
      ok: false,
      message: "Mağaza və plan seçimi mütləqdir.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", current.user.id)
    .maybeSingle();

  if (!store) {
    return {
      ok: false,
      message: "Bu mağaza üzərində icazəniz yoxdur.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const now = new Date();
  const endsAt = addOneMonth(now);

  await (supabaseAdmin as any)
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: now.toISOString(),
    })
    .eq("store_id", storeId)
    .in("status", ["trialing", "active", "past_due"]);

  const { error } = await (supabaseAdmin as any).from("subscriptions").insert({
    store_id: storeId,
    plan_id: planId,
    status: "active",
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    metadata: {
      payment_mode: "placeholder",
      note: "Real payment integration is not enabled yet.",
    },
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/store/dashboard/subscription");
  revalidatePath("/store/dashboard");

  return {
    ok: true,
    message: "Placeholder abunəlik aktiv edildi.",
  };
}

export async function updatePlanAction(
  formData: FormData,
): Promise<SubscriptionActionResult> {
  await requireRole(["admin"], "/admin/subscriptions");

  const planId = readString(formData, "planId");
  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const priceAmount = readNumber(formData, "priceAmount");
  const listingLimit = Math.trunc(readNumber(formData, "listingLimit"));
  const isActive = readString(formData, "isActive") === "on";

  if (!planId || !name) {
    return {
      ok: false,
      message: "Plan ID və ad mütləqdir.",
    };
  }

  if (priceAmount < 0 || listingLimit < 0) {
    return {
      ok: false,
      message: "Qiymət və elan limiti mənfi ola bilməz.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await (supabase as any)
    .from("subscription_plans")
    .update({
      name,
      description,
      price_amount: priceAmount,
      currency: "AZN",
      billing_interval: "month",
      features: [`${listingLimit} elan`],
      limits: {
        listing_limit: listingLimit,
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

  revalidatePath("/admin/subscriptions");
  revalidatePath("/store/dashboard/subscription");

  return {
    ok: true,
    message: "Plan yeniləndi.",
  };
}
