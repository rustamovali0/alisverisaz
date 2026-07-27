"use server";

import { revalidatePath } from "next/cache";

import { trackActivityEvent } from "@/lib/activity/events";
import { getCurrentUserProfile, requireRole } from "@/lib/auth/session";
import { getOwnedStores } from "@/lib/dashboard/data";
import { normalizeAzerbaijanPhone } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

async function canManageMessage(input: {
  messageId: string;
  role: string;
  userId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: messageRow } = await (supabase as any)
    .from("product_messages")
    .select("id,store_id,product_id,sender_id,stores(slug,name),products(name,slug)")
    .eq("id", input.messageId)
    .maybeSingle();

  if (!messageRow) {
    return {
      ok: false as const,
      message: null,
    };
  }

  if (input.role === "admin") {
    return {
      ok: true as const,
      message: messageRow,
    };
  }

  const stores = await getOwnedStores(input.userId);
  const storeIds = stores.map((store) => store.id);

  return {
    ok: storeIds.includes(messageRow.store_id),
    message: messageRow,
  };
}

async function getManageableMessageIds(input: {
  role: string;
  userId: string;
  messageId?: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (input.role === "admin") {
    if (!input.messageId) {
      const { data } = await (supabase as any).from("product_messages").select("id");

      return ((data ?? []) as Array<{ id: string }>).map((item) => item.id);
    }

    const { data } = await (supabase as any)
      .from("product_messages")
      .select("id")
      .eq("id", input.messageId)
      .maybeSingle();

    return data ? [data.id as string] : [];
  }

  const stores = await getOwnedStores(input.userId);
  const storeIds = stores.map((store) => store.id);

  if (storeIds.length === 0) {
    return [];
  }

  let query = (supabase as any)
    .from("product_messages")
    .select("id")
    .in("store_id", storeIds);

  if (input.messageId) {
    query = query.eq("id", input.messageId);
  }

  const { data } = await query;

  return ((data ?? []) as Array<{ id: string }>).map((item) => item.id);
}

export async function createProductMessageAction(
  formData: FormData,
): Promise<ActionResult> {
  const productId = readString(formData, "productId");
  const storeSlug = readString(formData, "storeSlug");
  const senderName = readString(formData, "senderName");
  const senderPhone = normalizeAzerbaijanPhone(readString(formData, "senderPhone"));
  const message = readString(formData, "message");
  const current = await getCurrentUserProfile();

  if (!productId || !senderName || !message) {
    return {
      ok: false,
      message: "Ad və mesaj mütləqdir.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: product, error: productError } = await (supabase as any)
    .from("products")
    .select("id,store_id,name,slug,stores(slug,name)")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (productError || !product) {
    return {
      ok: false,
      message: productError?.message ?? "Məhsul tapılmadı.",
    };
  }

  const store = Array.isArray(product.stores) ? product.stores[0] : product.stores;
  const resolvedStoreId = product.store_id as string;
  const resolvedStoreSlug =
    typeof store?.slug === "string" && store.slug ? store.slug : storeSlug;

  const { error } = await (supabase as any).from("product_messages").insert({
    product_id: productId,
    store_id: resolvedStoreId,
    sender_id: current?.user.id ?? null,
    sender_name: senderName,
    sender_phone: senderPhone || null,
    message,
  });

  if (error) {
    return {
      ok: false,
      message:
        error.code === "PGRST205" || error.message.includes("product_messages")
          ? "Mesaj sistemi üçün Supabase migration işlədilməyib. product_messages cədvəlini yaradın."
          : error.message,
    };
  }

  await trackActivityEvent({
    eventType: "message_created",
    actorId: current?.user.id,
    storeId: resolvedStoreId,
    productId,
    metadata: {
      title: "Yeni məhsul mesajı",
      description: `${product.name} · ${store?.name ?? "Mağaza"}`,
      product_name: product.name,
      store_name: store?.name,
      sender_name: senderName,
    },
  });

  if (resolvedStoreSlug) {
    revalidatePath(`/${resolvedStoreSlug}/products/${productId}`);
    if (typeof product.slug === "string" && product.slug) {
      revalidatePath(`/${resolvedStoreSlug}/products/${product.slug}`);
    }
  }

  revalidatePath("/store/dashboard/messages");
  revalidatePath("/radmin/messages");
  revalidatePath("/radmin/activity");

  return {
    ok: true,
    message: "Mesaj satıcıya göndərildi.",
  };
}

export async function updateProductMessageStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const current = await requireRole(["admin", "seller"], "/store/dashboard/messages");
  const messageId = readString(formData, "messageId");
  const status = readString(formData, "status");

  if (!messageId || !["new", "read", "archived"].includes(status)) {
    return {
      ok: false,
      message: "Mesaj və status seçimi yanlışdır.",
    };
  }

  const supabase = createSupabaseAdminClient();
  if (current.role === "seller") {
    const access = await canManageMessage({
      messageId,
      role: current.role,
      userId: current.user.id,
    });

    if (!access.ok) {
      return {
        ok: false,
        message: "Bu mesaj üzərində icazəniz yoxdur.",
      };
    }
  }

  const { error } = await (supabase as any)
    .from("product_messages")
    .update({ status })
    .eq("id", messageId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/store/dashboard/messages");
  revalidatePath("/radmin/messages");

  return {
    ok: true,
    message: "Mesaj statusu yeniləndi.",
  };
}

export async function replyProductMessageAction(
  formData: FormData,
): Promise<ActionResult> {
  const current = await requireRole(["admin", "seller"], "/store/dashboard/messages");
  const messageId = readString(formData, "messageId");
  const replyMessage = readString(formData, "replyMessage");

  if (!messageId || !replyMessage) {
    return {
      ok: false,
      message: "Cavab mətni mütləqdir.",
    };
  }

  const access = await canManageMessage({
    messageId,
    role: current.role,
    userId: current.user.id,
  });

  if (!access.ok || !access.message) {
    return {
      ok: false,
      message: "Bu mesaj üzərində icazəniz yoxdur.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("product_messages")
    .update({
      reply_message: replyMessage,
      reply_by: current.user.id,
      reply_at: new Date().toISOString(),
      status: "read",
    })
    .eq("id", messageId);

  if (error) {
    return {
      ok: false,
      message:
        error.code === "PGRST204" || error.message.includes("reply_message")
          ? "Mesaj cavabı üçün Supabase migration işlədilməyib."
          : error.message,
    };
  }

  if (access.message.sender_id) {
    const product = Array.isArray(access.message.products)
      ? access.message.products[0]
      : access.message.products;
    const storeForNotification = Array.isArray(access.message.stores)
      ? access.message.stores[0]
      : access.message.stores;

    await (supabase as any).from("notifications").insert({
      user_id: access.message.sender_id,
      type: "message_reply",
      title: "Mesajınıza cavab gəldi",
      body: `${product?.name ?? "Məhsul"} üzrə satıcı cavab yazdı.`,
      data: {
        message_id: messageId,
        product_id: access.message.product_id,
        store_slug: storeForNotification?.slug ?? null,
      },
    });
  }

  const store = Array.isArray(access.message.stores)
    ? access.message.stores[0]
    : access.message.stores;

  if (typeof store?.slug === "string" && store.slug) {
    revalidatePath(`/${store.slug}/products/${access.message.product_id}`);
    const product = Array.isArray(access.message.products)
      ? access.message.products[0]
      : access.message.products;
    if (typeof product?.slug === "string" && product.slug) {
      revalidatePath(`/${store.slug}/products/${product.slug}`);
    }
  }

  revalidatePath("/store/dashboard/messages");
  revalidatePath("/radmin/messages");

  return {
    ok: true,
    message: "Cavab göndərildi.",
  };
}

export async function deleteProductMessageAction(
  formData: FormData,
): Promise<ActionResult> {
  const current = await requireRole(["admin", "seller"], "/store/dashboard/messages");
  const messageId = readString(formData, "messageId");

  if (!messageId) {
    return {
      ok: false,
      message: "Silinəcək mesaj seçilməyib.",
    };
  }

  const manageableIds = await getManageableMessageIds({
    role: current.role,
    userId: current.user.id,
    messageId,
  });

  if (manageableIds.length === 0) {
    return {
      ok: false,
      message: "Bu mesaj üzərində icazəniz yoxdur.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("product_messages")
    .delete()
    .in("id", manageableIds);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/store/dashboard/messages");
  revalidatePath("/radmin/messages");
  revalidatePath("/radmin/activity");

  return {
    ok: true,
    message: "Mesaj silindi.",
  };
}

export async function deleteAllProductMessagesAction(): Promise<ActionResult> {
  const current = await requireRole(["admin", "seller"], "/store/dashboard/messages");
  const manageableIds = await getManageableMessageIds({
    role: current.role,
    userId: current.user.id,
  });

  if (manageableIds.length === 0) {
    return {
      ok: false,
      message: "Silinəcək mesaj tapılmadı.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("product_messages")
    .delete()
    .in("id", manageableIds);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/store/dashboard/messages");
  revalidatePath("/radmin/messages");
  revalidatePath("/radmin/activity");

  return {
    ok: true,
    message: "Bütün mesajlar silindi.",
  };
}
