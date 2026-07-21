import { getOwnedStores } from "@/lib/dashboard/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ManagedOrder, OrderStatus } from "@/lib/orders/types";

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: string;
  total_amount: string | number;
  currency: string;
  shipping_address:
    | {
        full_name?: string;
        phone?: string;
        address?: string;
      }
    | null;
  notes: string | null;
  created_at: string;
  stores?: {
    name: string;
    slug: string | null;
  } | null;
  order_items?: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
    total_amount: string | number;
  }>;
};

function toManagedOrder(row: OrderRow): ManagedOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    storeName: row.stores?.name ?? "-",
    storeSlug: row.stores?.slug ?? null,
    customerName: row.shipping_address?.full_name ?? "-",
    customerPhone: row.shipping_address?.phone ?? "-",
    address: row.shipping_address?.address ?? "-",
    note: row.notes,
    createdAt: row.created_at,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      totalAmount: Number(item.total_amount),
    })),
  };
}

async function getOrders(filters: {
  userId?: string;
  storeIds?: string[];
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  let query = (supabaseAdmin as any)
    .from("orders")
    .select(
      "id,order_number,status,payment_status,total_amount,currency,shipping_address,notes,created_at,stores(name,slug),order_items(id,product_id,product_name,quantity,total_amount)",
    )
    .order("created_at", {
      ascending: false,
    });

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.storeIds) {
    query = query.in(
      "store_id",
      filters.storeIds.length > 0
        ? filters.storeIds
        : ["00000000-0000-0000-0000-000000000000"],
    );
  }

  const { data } = await query;

  return ((data ?? []) as OrderRow[]).map(toManagedOrder);
}

export async function getCustomerOrders(userId: string) {
  return getOrders({
    userId,
  });
}

export async function getSellerOrders(userId: string) {
  const stores = await getOwnedStores(userId);

  return getOrders({
    storeIds: stores.map((store) => store.id),
  });
}

export async function getAdminOrders() {
  return getOrders({});
}
