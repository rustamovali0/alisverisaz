"use server";

import { revalidatePath } from "next/cache";

import { trackActivityEvent } from "@/lib/activity/events";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CustomerAddressActionResult = {
  ok: boolean;
  message: string;
};

export async function getFavoriteProductIdsAction() {
  const current = await requireRole(["customer", "seller"], "/favorites");
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any)
    .from("favorites")
    .select("product_id")
    .eq("user_id", current.user.id);

  if (error) return { ok: false as const, productIds: [] as string[] };
  return {
    ok: true as const,
    productIds: (data ?? []).map((row: { product_id?: string }) => row.product_id).filter(Boolean) as string[],
  };
}

export async function setFavoriteProductStateAction(productId: string, active: boolean) {
  const current = await requireRole(["customer", "seller"], "/favorites");
  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return { ok: false as const, message: "Məhsul məlumatı düzgün deyil." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const query = active
    ? (supabaseAdmin as any).from("favorites").upsert(
        { user_id: current.user.id, product_id: productId },
        { onConflict: "user_id,product_id", ignoreDuplicates: true },
      )
    : (supabaseAdmin as any).from("favorites").delete()
        .eq("user_id", current.user.id).eq("product_id", productId);
  const { error } = await query;
  if (error) return { ok: false as const, message: "Seçilmişlər yenilənmədi." };

  revalidatePath("/favorites");
  revalidatePath("/dashboard/favorites");
  return { ok: true as const, active };
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export async function saveDefaultCustomerAddressAction(
  formData: FormData,
): Promise<CustomerAddressActionResult> {
  const current = await requireRole(["customer", "seller"], "/dashboard/addresses");
  const addressId = readString(formData, "addressId");
  const label = readString(formData, "label") || "Əsas ünvan";
  const city = readString(formData, "city");
  const region = readString(formData, "region");
  const address = readString(formData, "address");
  const phone = readString(formData, "phone");

  if (
    label.length > 80 ||
    address.length < 5 ||
    address.length > 500 ||
    city.length > 120 ||
    region.length > 120 ||
    phone.length > 40
  ) {
    return {
      ok: false,
      message: "Ünvan məlumatları düzgün deyil.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const userId = current.user.id;
  const { data: previousDefault } = await (supabaseAdmin as any)
    .from("customer_addresses")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  const payload = {
    label,
    city: city || null,
    region: region || null,
    address,
    phone: phone || current.profile?.phone || null,
    is_default: true,
  };

  const { error: clearError } = await (supabaseAdmin as any)
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("user_id", userId);

  if (clearError) {
    return {
      ok: false,
      message: "Ünvan saxlanılmadı. Bir az sonra yenidən cəhd edin.",
    };
  }

  const query = addressId
    ? (supabaseAdmin as any)
        .from("customer_addresses")
        .update(payload)
        .eq("id", addressId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle()
    : (supabaseAdmin as any)
        .from("customer_addresses")
        .insert({ ...payload, user_id: userId })
        .select("id")
        .maybeSingle();

  const { data: savedAddress, error } = await query;

  if (error || !savedAddress) {
    if (previousDefault?.id) {
      await (supabaseAdmin as any)
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", previousDefault.id)
        .eq("user_id", userId);
    }

    return {
      ok: false,
      message: "Ünvan saxlanılmadı. Bir az sonra yenidən cəhd edin.",
    };
  }

  revalidatePath("/dashboard/addresses");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  await trackActivityEvent({
    eventType: "address_saved",
    actorId: userId,
    metadata: {
      title: "Ünvan saxlanıldı",
      description: `${label} ünvanı əsas ünvan kimi saxlanıldı.`,
      city,
      region,
    },
  });

  return {
    ok: true,
    message: "Ünvan əsas ünvan kimi saxlanıldı.",
  };
}
