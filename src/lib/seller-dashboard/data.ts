import { getOwnedStores } from "@/lib/dashboard/data";
import { getStoreEntitlements } from "@/lib/subscriptions/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ManagedOrder, OrderStatus } from "@/lib/orders/types";
import { getSellerOrders } from "@/lib/orders/data";

type ProductStatus = "active" | "draft" | "archived";

const newOrderStatuses: OrderStatus[] = ["pending", "confirmed"];
const processingStatuses: OrderStatus[] = ["processing"];
const shippedStatuses: OrderStatus[] = ["shipped"];
const completedStatuses: OrderStatus[] = ["delivered"];
const cancelledStatuses: OrderStatus[] = ["canceled", "refunded"];

function countByStatus<T extends string>(rows: Array<{ status: T }>, statuses: T[]) {
  return rows.filter((row) => statuses.includes(row.status)).length;
}

function sumOrders(orders: ManagedOrder[], since?: Date) {
  return orders
    .filter((order) => {
      if (order.status === "canceled" || order.status === "refunded") {
        return false;
      }

      if (!since) {
        return true;
      }

      return new Date(order.createdAt) >= since;
    })
    .reduce((sum, order) => sum + order.totalAmount, 0);
}

export async function getSellerDashboardOverview(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const stores = await getOwnedStores(userId);
  const storeIds = stores.map((store) => store.id);
  const safeStoreIds = storeIds.length > 0 ? storeIds : ["00000000-0000-0000-0000-000000000000"];
  const [productsResult, unreadResult, orders, entitlements] = await Promise.all([
    (supabaseAdmin as any)
      .from("products")
      .select("id,status,listing_type,stock_quantity,price_amount,currency")
      .in("store_id", safeStoreIds),
    (supabaseAdmin as any)
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    getSellerOrders(userId),
    Promise.all(storeIds.map((storeId) => getStoreEntitlements(storeId))),
  ]);
  const products = (productsResult.data ?? []) as Array<{
    id: string;
    status: ProductStatus;
    listing_type: string;
    stock_quantity: number;
    price_amount: string | number;
    currency: string;
  }>;
  const productLimit =
    entitlements.length === 0
      ? 0
      : entitlements.some((item) => item.productLimit === null)
        ? null
        : entitlements.reduce((sum, item) => sum + Number(item.productLimit ?? 0), 0);
  const productUsage = entitlements.reduce((sum, item) => sum + item.productCount, 0);
  const currency = orders[0]?.currency ?? products[0]?.currency ?? "AZN";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    stores,
    currency,
    products: {
      total: products.length,
      active: countByStatus(products, ["active"]),
      draft: countByStatus(products, ["draft"]),
      archived: countByStatus(products, ["archived"]),
      usage: productUsage,
      limit: productLimit,
      usageRatio:
        productLimit && productLimit > 0
          ? Math.min(productUsage / productLimit, 1)
          : null,
    },
    orders: {
      total: orders.length,
      new: countByStatus(orders, newOrderStatuses),
      processing: countByStatus(orders, processingStatuses),
      shipped: countByStatus(orders, shippedStatuses),
      completed: countByStatus(orders, completedStatuses),
      cancelled: countByStatus(orders, cancelledStatuses),
      recent: orders.slice(0, 5),
    },
    sales: {
      today: sumOrders(orders, startOfToday),
      last7Days: sumOrders(orders, startOfWeek),
      month: sumOrders(orders, startOfMonth),
      completedOrderCount: countByStatus(orders, completedStatuses),
    },
    unreadNotifications: unreadResult.count ?? 0,
  };
}
