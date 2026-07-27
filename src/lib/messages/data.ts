import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth/session";

export type ProductMessage = {
  id: string;
  productId: string;
  storeId: string;
  productName: string;
  productSlug: string | null;
  productImageUrl: string | null;
  storeName: string;
  storeSlug: string | null;
  senderName: string;
  senderPhone: string | null;
  message: string;
  replyMessage: string | null;
  replyAt: string | null;
  status: string;
  createdAt: string;
};

type MessageRow = {
  id: string;
  product_id: string;
  store_id: string;
  sender_name: string;
  sender_phone: string | null;
  message: string;
  reply_message?: string | null;
  reply_at?: string | null;
  status: string;
  created_at: string;
  products?: {
    name: string;
    slug: string | null;
  } | null;
  stores?: {
    name: string;
    slug: string | null;
  } | null;
};

type ProductImageRow = {
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number | null;
};

function getPrimaryImage(productId: string, imageMap: Map<string, ProductImageRow[]>) {
  return [...(imageMap.get(productId) ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) {
      return a.is_primary ? -1 : 1;
    }

    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  })[0]?.url ?? null;
}

function mapMessage(row: MessageRow, imageMap: Map<string, ProductImageRow[]>): ProductMessage {
  return {
    id: row.id,
    productId: row.product_id,
    storeId: row.store_id,
    productName: row.products?.name ?? row.product_id,
    productSlug: row.products?.slug ?? null,
    productImageUrl: getPrimaryImage(row.product_id, imageMap),
    storeName: row.stores?.name ?? row.store_id,
    storeSlug: row.stores?.slug ?? null,
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    message: row.message,
    replyMessage: row.reply_message ?? null,
    replyAt: row.reply_at ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function loadImageMap(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, ProductImageRow[]>();
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("product_images")
    .select("product_id,url,is_primary,sort_order")
    .in("product_id", productIds);

  return ((data ?? []) as ProductImageRow[]).reduce((map, image) => {
    const current = map.get(image.product_id) ?? [];
    current.push(image);
    map.set(image.product_id, current);
    return map;
  }, new Map<string, ProductImageRow[]>());
}

async function mapRows(rows: MessageRow[], hideSenderPhone = false) {
  const productIds = Array.from(new Set(rows.map((row) => row.product_id)));
  const imageMap = await loadImageMap(productIds);

  return rows.map((row) => ({
    ...mapMessage(row, imageMap),
    senderPhone: hideSenderPhone ? null : row.sender_phone,
  }));
}

export async function getProductMessagesForProduct(productId: string) {
  const current = await getCurrentUserProfile();

  if (!current) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("product_messages")
    .select("id,product_id,store_id,sender_name,sender_phone,message,reply_message,reply_at,status,created_at,products(name,slug),stores(name,slug)")
    .eq("product_id", productId)
    .eq("sender_id", current.user.id)
    .order("created_at", {
      ascending: true,
    })
    .limit(100);

  return mapRows((data ?? []) as MessageRow[], true);
}

export async function getSellerProductMessages(storeIds: string[]) {
  if (storeIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("product_messages")
    .select("id,product_id,store_id,sender_name,sender_phone,message,reply_message,reply_at,status,created_at,products(name,slug),stores(name,slug)")
    .in("store_id", storeIds)
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  return mapRows((data ?? []) as MessageRow[]);
}

export async function getAdminProductMessages() {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("product_messages")
    .select("id,product_id,store_id,sender_name,sender_phone,message,reply_message,reply_at,status,created_at,products(name,slug),stores(name,slug)")
    .order("created_at", {
      ascending: false,
    })
    .limit(300);

  return mapRows((data ?? []) as MessageRow[]);
}
