import { getOwnedStores } from "@/lib/dashboard/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ManagedOrder, OrderStatus } from "@/lib/orders/types";

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: string;
  subtotal_amount: string | number;
  shipping_amount: string | number;
  delivery_amount: string | number | null;
  delivery_method: string | null;
  delivery_estimate: string | null;
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
    product_sku: string | null;
    quantity: number;
    unit_price_amount: string | number;
    total_amount: string | number;
    metadata?: {
      variant_snapshot?: Array<{
        name?: unknown;
        value?: unknown;
        type?: unknown;
        colorHex?: unknown;
      }>;
    } | null;
  }>;
};

type ProductLookupRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price_amount: string | number;
  discount_amount: string | number | null;
  stores?: {
    slug: string | null;
  } | null;
  product_images?: Array<{
    url: string;
    is_primary: boolean;
    sort_order: number | null;
  }>;
};

function getPrimaryImage(product: ProductLookupRow | null) {
  return [...(product?.product_images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }

    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  })[0]?.url ?? null;
}

function getUnitPrice(product: ProductLookupRow | null) {
  if (!product) {
    return 0;
  }

  return Math.max(Number(product.price_amount) - Number(product.discount_amount ?? 0), 0);
}

function toManagedOrder(
  row: OrderRow,
  productMap: Map<string, ProductLookupRow>,
): ManagedOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    subtotalAmount: Number(row.subtotal_amount ?? 0),
    shippingAmount: Number(row.delivery_amount ?? row.shipping_amount ?? 0),
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    deliveryMethod: row.delivery_method,
    estimatedDelivery: row.delivery_estimate,
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
      productName: productMap.get(item.product_id ?? "")?.name ?? item.product_name,
      productSlug: productMap.get(item.product_id ?? "")?.slug ?? null,
      storeSlug: productMap.get(item.product_id ?? "")?.stores?.slug ?? row.stores?.slug ?? null,
      description: productMap.get(item.product_id ?? "")?.description ?? null,
      imageUrl: getPrimaryImage(productMap.get(item.product_id ?? "") ?? null),
      sku: item.product_sku,
      unitPrice: Number(item.unit_price_amount ?? getUnitPrice(productMap.get(item.product_id ?? "") ?? null)),
      quantity: item.quantity,
      totalAmount: Number(item.total_amount),
      variantSnapshot: Array.isArray(item.metadata?.variant_snapshot)
        ? item.metadata.variant_snapshot
            .map((variant) => ({
              name: typeof variant.name === "string" ? variant.name : "",
              value: typeof variant.value === "string" ? variant.value : "",
              type: typeof variant.type === "string" ? variant.type : undefined,
              colorHex:
                typeof variant.colorHex === "string" ? variant.colorHex : null,
            }))
            .filter((variant) => variant.name && variant.value)
        : [],
    })),
  };
}

async function getOrders(filters: {
  userId?: string;
  storeIds?: string[];
  orderId?: string;
  limit?: number;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  let query = (supabaseAdmin as any)
    .from("orders")
    .select(
      "id,order_number,status,payment_status,subtotal_amount,shipping_amount,delivery_amount,delivery_method,delivery_estimate,total_amount,currency,shipping_address,notes,created_at,stores(name,slug),order_items(id,product_id,product_name,product_sku,quantity,unit_price_amount,total_amount,metadata)",
    )
    .order("created_at", {
      ascending: false,
    });

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.orderId) {
    query = query.eq("id", filters.orderId);
  }

  if (filters.storeIds) {
    query = query.in(
      "store_id",
      filters.storeIds.length > 0
        ? filters.storeIds
        : ["00000000-0000-0000-0000-000000000000"],
    );
  }

  const { data } = await query.limit(filters.limit ?? 100);
  const rows = (data ?? []) as OrderRow[];
  const productIds = Array.from(
    new Set(
      rows
        .flatMap((row) => row.order_items ?? [])
        .map((item) => item.product_id)
        .filter((productId): productId is string => Boolean(productId)),
    ),
  );
  let productMap = new Map<string, ProductLookupRow>();

  if (productIds.length > 0) {
    const { data: products } = await (supabaseAdmin as any)
      .from("products")
      .select(
        "id,name,slug,description,price_amount,discount_amount,stores(slug),product_images(url,is_primary,sort_order)",
      )
      .in("id", productIds);

    productMap = new Map(
      ((products ?? []) as ProductLookupRow[]).map((product) => [product.id, product]),
    );
  }

  return rows.map((row) => toManagedOrder(row, productMap));
}

export async function getCustomerOrders(userId: string) {
  return getOrders({
    userId,
    limit: 20,
  });
}

export async function getCustomerOrderDetail(userId: string, orderId: string) {
  const orders = await getOrders({
    userId,
    orderId,
    limit: 1,
  });

  return orders[0] ?? null;
}

export async function getSellerOrders(userId: string) {
  const stores = await getOwnedStores(userId);

  return getOrders({
    storeIds: stores.map((store) => store.id),
    limit: 50,
  });
}

export async function getAdminOrders() {
  return getOrders({});
}
