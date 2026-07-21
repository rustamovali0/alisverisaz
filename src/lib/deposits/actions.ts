"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DepositActionResult } from "@/lib/deposits/types";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function calculateDepositAmount(input: {
  priceAmount: number;
  discountAmount: number;
  depositType: "fixed" | "percent";
  depositValue: number;
}) {
  const finalPrice = Math.max(input.priceAmount - input.discountAmount, 0);

  if (input.depositType === "percent") {
    return Math.round(finalPrice * (input.depositValue / 100) * 100) / 100;
  }

  return input.depositValue;
}

async function ensureCustomer(input: {
  storeId: string;
  userId: string;
  email: string | null;
  fullName: string;
  phone: string;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existing } = await (supabaseAdmin as any)
    .from("customers")
    .select("id")
    .eq("store_id", input.storeId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existing) {
    await (supabaseAdmin as any)
      .from("customers")
      .update({
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
      })
      .eq("id", existing.id);

    return existing.id as string;
  }

  const { data: customer, error } = await (supabaseAdmin as any)
    .from("customers")
    .insert({
      store_id: input.storeId,
      user_id: input.userId,
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
    })
    .select("id")
    .single();

  if (error || !customer) {
    throw new Error(error?.message ?? "Müştəri qeydi yaradıla bilmədi.");
  }

  return customer.id as string;
}

export async function createDepositAction(
  formData: FormData,
): Promise<DepositActionResult> {
  const current = await requireRole(["customer"], "/products");
  const productId = readString(formData, "productId");
  const fullName = readString(formData, "fullName");
  const phone = readString(formData, "phone");

  if (!productId || !fullName || !phone) {
    return {
      ok: false,
      message: "Məhsul, ad soyad və telefon mütləqdir.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: setting } = await (supabaseAdmin as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "deposit")
    .maybeSingle();

  if (!setting?.value?.enabled) {
    return {
      ok: false,
      message: "Beh sistemi hazırda deaktivdir.",
    };
  }

  const { data: product, error: productError } = await (supabaseAdmin as any)
    .from("products")
    .select(
      "id,store_id,name,price_amount,discount_amount,deposit_enabled,deposit_type,deposit_value,stores(owner_id)",
    )
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (productError || !product) {
    return {
      ok: false,
      message: productError?.message ?? "Məhsul tapılmadı.",
    };
  }

  if (!product.deposit_enabled) {
    return {
      ok: false,
      message: "Bu məhsul üçün beh aktiv deyil.",
    };
  }

  const store = Array.isArray(product.stores) ? product.stores[0] : product.stores;
  const ownerId = store?.owner_id;

  if (!ownerId) {
    return {
      ok: false,
      message: "Satıcı məlumatı tapılmadı.",
    };
  }

  const amount = calculateDepositAmount({
    priceAmount: Number(product.price_amount),
    discountAmount: Number(product.discount_amount ?? 0),
    depositType: product.deposit_type,
    depositValue: Number(product.deposit_value ?? 0),
  });
  const finalPrice = Math.max(
    Number(product.price_amount) - Number(product.discount_amount ?? 0),
    0,
  );
  const remainingAmount = Math.max(finalPrice - amount, 0);

  if (amount <= 0) {
    return {
      ok: false,
      message: "Beh məbləği düzgün deyil.",
    };
  }

  try {
    const customerId = await ensureCustomer({
      storeId: product.store_id,
      userId: current.user.id,
      email: current.user.email ?? null,
      fullName,
      phone,
    });
    const { data: deposit, error } = await (supabaseAdmin as any)
      .from("deposits")
      .insert({
        store_id: product.store_id,
        owner_id: ownerId,
        user_id: current.user.id,
        customer_id: customerId,
        product_id: product.id,
        full_name: fullName,
        phone,
        amount,
        remaining_amount: remainingAmount,
        currency: "AZN",
        status: "pending",
        method: "placeholder",
        metadata: {
          product_name: product.name,
          payment_mode: "placeholder",
        },
      })
      .select("id")
      .single();

    if (error || !deposit) {
      throw new Error(error?.message ?? "Beh sifarişi yaradıla bilmədi.");
    }

    const paymentUrl = `/payments/deposit/${deposit.id}`;
    const { error: updateError } = await (supabaseAdmin as any)
      .from("deposits")
      .update({
        payment_url: paymentUrl,
        reference: deposit.id,
      })
      .eq("id", deposit.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/store/dashboard/deposits");

    return {
      ok: true,
      message: "Beh sifarişi yaradıldı.",
      paymentUrl,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Beh sifarişi yaradıla bilmədi.",
    };
  }
}
