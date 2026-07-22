import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth/session";

export type ProductMessage = {
  id: string;
  productId: string;
  storeId: string;
  productName: string;
  storeName: string;
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
  } | null;
  stores?: {
    name: string;
  } | null;
};

function mapMessage(row: MessageRow): ProductMessage {
  return {
    id: row.id,
    productId: row.product_id,
    storeId: row.store_id,
    productName: row.products?.name ?? row.product_id,
    storeName: row.stores?.name ?? row.store_id,
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    message: row.message,
    replyMessage: row.reply_message ?? null,
    replyAt: row.reply_at ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getProductMessagesForProduct(productId: string) {
  const current = await getCurrentUserProfile();

  if (!current) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("product_messages")
    .select("id,product_id,store_id,sender_name,sender_phone,message,reply_message,reply_at,status,created_at,products(name),stores(name)")
    .eq("product_id", productId)
    .eq("sender_id", current.user.id)
    .order("created_at", {
      ascending: true,
    })
    .limit(100);

  return ((data ?? []) as MessageRow[]).map((row) => ({
    ...mapMessage(row),
    senderPhone: null,
  }));
}

export async function getSellerProductMessages(storeIds: string[]) {
  if (storeIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("product_messages")
    .select("id,product_id,store_id,sender_name,sender_phone,message,reply_message,reply_at,status,created_at,products(name),stores(name)")
    .in("store_id", storeIds)
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export async function getAdminProductMessages() {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("product_messages")
    .select("id,product_id,store_id,sender_name,sender_phone,message,reply_message,reply_at,status,created_at,products(name),stores(name)")
    .order("created_at", {
      ascending: false,
    })
    .limit(300);

  return ((data ?? []) as MessageRow[]).map(mapMessage);
}
