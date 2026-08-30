"use server";

import { revalidatePath } from "next/cache";

import { trackActivityEvent } from "@/lib/activity/events";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CustomerAddressActionResult = {
  ok: boolean;
  message: string;
};

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
  const payload = {
    label,
    city: city || null,
    region: region || null,
    address,
    phone: phone || current.profile?.phone || null,
    is_default: true,
  };

  await (supabaseAdmin as any)
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("user_id", userId);

  const query = addressId
    ? (supabaseAdmin as any)
        .from("customer_addresses")
        .update(payload)
        .eq("id", addressId)
        .eq("user_id", userId)
    : (supabaseAdmin as any)
        .from("customer_addresses")
        .insert({ ...payload, user_id: userId });

  const { error } = await query;

  if (error) {
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
