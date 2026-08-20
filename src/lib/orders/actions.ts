"use server";

import { revalidatePath } from "next/cache";

import { trackActivityEvent } from "@/lib/activity/events";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { getOwnedStores } from "@/lib/dashboard/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderActionResult, OrderStatus } from "@/lib/orders/types";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

const adminOrderStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "canceled",
  "refunded",
  "archived",
];

const sellerOrderStatuses: OrderStatus[] = ["canceled", "archived"];

function readOrderStatus(value: string): OrderStatus | null {
  const normalized = value === "cancelled" ? "canceled" : value;

  if (adminOrderStatuses.includes(normalized as OrderStatus)) {
    return normalized as OrderStatus;
  }

  return null;
}

function canSellerSetStatus(status: OrderStatus) {
  return sellerOrderStatuses.includes(status);
}

async function getManageableOrderIds(input: {
  role: string;
  userId: string;
  orderId?: string;
}) {
  const supabaseAdmin = createSupabaseAdminClient();

  if (input.role === "admin") {
    if (!input.orderId) {
      const { data } = await (supabaseAdmin as any).from("orders").select("id");

      return ((data ?? []) as Array<{ id: string }>).map((order) => order.id);
    }

    const { data } = await (supabaseAdmin as any)
      .from("orders")
      .select("id")
      .eq("id", input.orderId)
      .maybeSingle();

    return data ? [data.id as string] : [];
  }

  const featureEnabled = await getSellerFeatureAccess(input.userId, "orders");

  if (!featureEnabled) {
    return [];
  }

  const stores = await getOwnedStores(input.userId);
  const storeIds = stores.map((store) => store.id);

  if (storeIds.length === 0) {
    return [];
  }

  let query = (supabaseAdmin as any)
    .from("orders")
    .select("id")
    .in("store_id", storeIds);

  if (input.orderId) {
    query = query.eq("id", input.orderId);
  }

  const { data } = await query;

  return ((data ?? []) as Array<{ id: string }>).map((order) => order.id);
}

function revalidateOrderPaths() {
  revalidatePath("/store/dashboard/orders");
  revalidatePath("/store/dashboard/earnings");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/earnings");
  revalidatePath("/radmin/orders");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}

async function getOrderActivityContext(orderId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("orders")
    .select("id,store_id,order_number,total_amount")
    .eq("id", orderId)
    .maybeSingle();

  return data as
    | {
        id: string;
        store_id: string | null;
        order_number: string | null;
        total_amount: string | number | null;
      }
    | null;
}

async function trackOrderStatusChange(input: {
  actorId: string;
  role: string;
  orderId: string;
  status: OrderStatus;
}) {
  const order = await getOrderActivityContext(input.orderId);

  await trackActivityEvent({
    eventType: "order_status_updated",
    actorId: input.actorId,
    storeId: order?.store_id ?? null,
    metadata: {
      title: "Sifariş statusu yeniləndi",
      description: order?.order_number ?? input.status,
      order_id: input.orderId,
      status: input.status,
      role: input.role,
    },
  });
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

  if (current.role === "seller" && !canSellerSetStatus(status)) {
    return {
      ok: false,
      message: "Satıcı bu status keçidini edə bilməz.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const orderIds = await getManageableOrderIds({
    role: current.role,
    userId: current.user.id,
    orderId,
  });

  if (orderIds.length === 0) {
    return {
      ok: false,
      message: "Bu sifariş üzərində icazəniz yoxdur.",
    };
  }

  const { error } = await (supabaseAdmin as any)
    .from("orders")
    .update({
      status,
    })
    .eq("id", orderId)
    .in("id", orderIds);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await trackOrderStatusChange({
    actorId: current.user.id,
    role: current.role,
    orderId,
    status,
  });
  revalidateOrderPaths();

  return {
    ok: true,
    message: "Sifariş statusu yeniləndi.",
  };
}

export async function deleteOrderAction(
  formData: FormData,
): Promise<OrderActionResult> {
  const current = await requireRole(["seller", "admin"], "/store/dashboard/orders");
  const orderId = readString(formData, "orderId");

  if (!orderId) {
    return {
      ok: false,
      message: "Silinəcək sifariş seçilməyib.",
    };
  }

  const orderIds = await getManageableOrderIds({
    role: current.role,
    userId: current.user.id,
    orderId,
  });

  if (orderIds.length === 0) {
    return {
      ok: false,
      message: "Bu sifariş üzərində icazəniz yoxdur.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (current.role === "seller") {
    const { error } = await (supabaseAdmin as any)
      .from("orders")
      .update({
        status: "archived",
      })
      .in("id", orderIds);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await trackOrderStatusChange({
      actorId: current.user.id,
      role: current.role,
      orderId,
      status: "archived",
    });
    revalidateOrderPaths();

    return {
      ok: true,
      message: "Sifariş arxivləndi.",
    };
  }

  const { error } = await (supabaseAdmin as any)
    .from("orders")
    .delete()
    .in("id", orderIds);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await trackActivityEvent({
    eventType: "order_deleted",
    actorId: current.user.id,
    metadata: {
      title: "Sifariş silindi",
      order_id: orderId,
      role: current.role,
    },
  });
  revalidateOrderPaths();

  return {
    ok: true,
    message: "Sifariş silindi.",
  };
}

export async function deleteAllOrdersAction(): Promise<OrderActionResult> {
  const current = await requireRole(["seller", "admin"], "/store/dashboard/orders");
  const orderIds = await getManageableOrderIds({
    role: current.role,
    userId: current.user.id,
  });

  if (orderIds.length === 0) {
    return {
      ok: false,
      message: "Silinəcək sifariş tapılmadı.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (current.role === "seller") {
    const { error } = await (supabaseAdmin as any)
      .from("orders")
      .update({
        status: "archived",
      })
      .in("id", orderIds);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await trackActivityEvent({
      eventType: "order_status_updated",
      actorId: current.user.id,
      metadata: {
        title: "Sifarişlər arxivləndi",
        order_ids: orderIds,
        status: "archived",
        role: current.role,
      },
    });
    revalidateOrderPaths();

    return {
      ok: true,
      message: "Sifarişlər arxivləndi.",
    };
  }

  const { error } = await (supabaseAdmin as any)
    .from("orders")
    .delete()
    .in("id", orderIds);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await trackActivityEvent({
    eventType: "order_deleted",
    actorId: current.user.id,
    metadata: {
      title: "Bütün sifarişlər silindi",
      order_ids: orderIds,
      role: current.role,
    },
  });
  revalidateOrderPaths();

  return {
    ok: true,
    message: "Bütün sifarişlər silindi.",
  };
}
