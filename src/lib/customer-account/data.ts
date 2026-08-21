import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCustomerOrders } from "@/lib/orders/data";
import type { ManagedOrder, OrderStatus } from "@/lib/orders/types";

const activeStatuses: OrderStatus[] = ["pending", "confirmed", "processing", "shipped"];
const completedStatuses: OrderStatus[] = ["delivered"];

export type CustomerFavoritePreview = {
  id: string;
  productId: string;
  name: string;
  slug: string | null;
  storeSlug: string | null;
  imageUrl: string | null;
  priceAmount: number;
  currency: string;
  createdAt: string;
};

export type CustomerNotificationPreview = {
  id: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  city: string | null;
  region: string | null;
  address: string;
  phone: string | null;
  isDefault: boolean;
};

type FavoriteRow = {
  id: string;
  product_id: string;
  created_at: string;
  products?: {
    name: string;
    slug: string | null;
    price_amount: string | number;
    currency: string;
    stores?: { slug: string | null } | null;
    product_images?: Array<{
      url: string;
      is_primary: boolean;
      sort_order: number | null;
    }>;
  } | null;
};

function countByStatus(orders: ManagedOrder[], statuses: OrderStatus[]) {
  return orders.filter((order) => statuses.includes(order.status)).length;
}

function getPrimaryImage(row: FavoriteRow) {
  return [...(row.products?.product_images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }

    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  })[0]?.url ?? null;
}

async function countRows(table: string, userId: string, extra?: (query: any) => any) {
  const supabaseAdmin = createSupabaseAdminClient();
  let query = (supabaseAdmin as any)
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (extra) {
    query = extra(query);
  }

  const { count } = await query;

  return count ?? 0;
}

async function getFavoritePreviewRows(userId: string, limit: number) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("favorites")
    .select(
      "id,product_id,created_at,products(name,slug,price_amount,currency,stores(slug),product_images(url,is_primary,sort_order))",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as FavoriteRow[]).map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: row.products?.name ?? row.product_id,
    slug: row.products?.slug ?? null,
    storeSlug: row.products?.stores?.slug ?? null,
    imageUrl: getPrimaryImage(row),
    priceAmount: Number(row.products?.price_amount ?? 0),
    currency: row.products?.currency ?? "AZN",
    createdAt: row.created_at,
  }));
}

export async function getCustomerAccountOverview(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const [orders, favoriteCount, unreadNotificationCount, favorites, notificationRows] =
    await Promise.all([
      getCustomerOrders(userId),
      countRows("favorites", userId),
      countRows("notifications", userId, (query) => query.is("read_at", null)),
      getFavoritePreviewRows(userId, 4),
      (supabaseAdmin as any)
        .from("notifications")
        .select("id,title,body,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const activeOrders = orders.filter((order) => activeStatuses.includes(order.status));

  return {
    stats: {
      orders: orders.length,
      activeOrders: countByStatus(orders, activeStatuses),
      completedOrders: countByStatus(orders, completedStatuses),
      favorites: favoriteCount,
      unreadNotifications: unreadNotificationCount,
    },
    activeOrders: activeOrders.slice(0, 3),
    favorites,
    notifications: ((notificationRows.data ?? []) as Array<{
      id: string;
      title: string;
      body: string | null;
      read_at: string | null;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      readAt: row.read_at,
      createdAt: row.created_at,
    })),
  };
}

export async function getCustomerFavoritePreviews(userId: string) {
  return getFavoritePreviewRows(userId, 30);
}

export async function getCustomerNotifications(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("notifications")
    .select("id,title,body,read_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return ((data ?? []) as Array<{
    id: string;
    title: string;
    body: string | null;
    read_at: string | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function getCustomerAddresses(userId: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any)
    .from("customer_addresses")
    .select("id,label,city,region,address,phone,is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return ((data ?? []) as Array<{
    id: string;
    label: string;
    city: string | null;
    region: string | null;
    address: string;
    phone: string | null;
    is_default: boolean;
  }>).map((row) => ({
    id: row.id,
    label: row.label,
    city: row.city,
    region: row.region,
    address: row.address,
    phone: row.phone,
    isDefault: row.is_default,
  }));
}
