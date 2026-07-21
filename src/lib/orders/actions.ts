"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderActionResult, OrderStatus } from "@/lib/orders/types";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readOrderStatus(value: string): OrderStatus | null {
  if (
    value === "pending" ||
    value === "confirmed" ||
    value === "processing" ||
    value === "delivered" ||
    value === "canceled"
  ) {
    return value;
  }

  return null;
}

export async function updateOrderStatusAction(
  formData: FormData,
): Promise<OrderActionResult> {
  const current = await requireRole(["seller", "admin"], "/store/dashboard/orders");
  const orderId = readString(formData, "orderId");
  const status = readOrderStatus(readString(formData, "status"));

  if (!orderId || !status) {
    return {
      ok: false,
      message: "Sifariş və status seçimi mütləqdir.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (current.role === "seller") {
    const featureEnabled = await getSellerFeatureAccess(current.user.id, "orders");

    if (!featureEnabled) {
      return {
        ok: false,
        message: "Sifariş idarəetməsi admin tərəfindən deaktiv edilib.",
      };
    }

    const stores = await getOwnedStores(current.user.id);
    const storeIds = stores.map((store) => store.id);
    const { data: order } = await (supabaseAdmin as any)
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .in(
        "store_id",
        storeIds.length > 0
          ? storeIds
          : ["00000000-0000-0000-0000-000000000000"],
      )
      .maybeSingle();

    if (!order) {
      return {
        ok: false,
        message: "Bu sifariş üzərində icazəniz yoxdur.",
      };
    }
  }

  const { error } = await (supabaseAdmin as any)
    .from("orders")
    .update({
      status,
    })
    .eq("id", orderId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/store/dashboard/orders");
  revalidatePath("/radmin/orders");
  revalidatePath("/dashboard/orders");

  return {
    ok: true,
    message: "Sifariş statusu yeniləndi.",
  };
}
