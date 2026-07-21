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
    .select("id,store_id,name,stores(slug,name)")
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
    const stores = await getOwnedStores(current.user.id);
    const storeIds = stores.map((store) => store.id);
    const { data: messageRow } = await (supabase as any)
      .from("product_messages")
      .select("id")
      .eq("id", messageId)
      .in(
        "store_id",
        storeIds.length > 0
          ? storeIds
          : ["00000000-0000-0000-0000-000000000000"],
      )
      .maybeSingle();

    if (!messageRow) {
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
