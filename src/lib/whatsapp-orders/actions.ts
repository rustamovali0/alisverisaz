"use server";

import { revalidatePath } from "next/cache";

import { recordAdminAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { trackActivityEvent } from "@/lib/activity/events";
import { normalizeAzerbaijanPhone } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizeOrderMethod,
  normalizeWhatsAppTemplate,
  type OrderMethod,
} from "@/lib/whatsapp-orders/template";

type WhatsAppOrderActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readSettings(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function readOrderMethod(formData: FormData): OrderMethod {
  return normalizeOrderMethod(readString(formData, "orderMethod"));
}

function ensureWhatsappMethodAllowed(method: OrderMethod, whatsappPhone: string) {
  if (method === "whatsapp" && !whatsappPhone) {
    return "WhatsApp üzərindən sifariş qəbul etmək üçün WhatsApp nömrəsi əlavə edilməlidir.";
  }

  return null;
}

export async function updateSellerOrderMethodAction(
  formData: FormData,
): Promise<WhatsAppOrderActionResult> {
  const current = await requireRole(["seller"], "/store/dashboard/settings");
  const storeId = readString(formData, "storeId");
  const orderMethod = readOrderMethod(formData);
  const whatsappPhone = normalizeAzerbaijanPhone(readString(formData, "whatsappPhone"));

  if (!storeId) {
    return { ok: false, message: "Mağaza ID tapılmadı." };
  }

  const methodError = ensureWhatsappMethodAllowed(orderMethod, whatsappPhone);

  if (methodError) {
    return { ok: false, message: methodError };
  }

  const supabase = createSupabaseAdminClient();
  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id,owner_id,settings")
    .eq("id", storeId)
    .eq("owner_id", current.user.id)
    .maybeSingle();

  if (!store) {
    return { ok: false, message: "Mağaza tapılmadı." };
  }

  const previousSettings = readSettings(store.settings);
  const previousMethod = normalizeOrderMethod(previousSettings.orderMethod);
  const settings = {
    ...previousSettings,
    orderMethod,
    whatsappPhone,
  };
  const { error } = await (supabase as any)
    .from("stores")
    .update({ settings })
    .eq("id", storeId)
    .eq("owner_id", current.user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await trackActivityEvent({
    eventType: "seller_order_method_changed",
    actorId: current.user.id,
    storeId,
    metadata: {
      title: "Sifariş qəbul etmə üsulu dəyişdi",
      description: `${previousMethod} → ${orderMethod}`,
      old_value: previousMethod,
      new_value: orderMethod,
    },
  });
  revalidatePath("/store/dashboard/settings");
  revalidatePath("/checkout");
  revalidatePath("/cart");

  return {
    ok: true,
    message:
      orderMethod === "whatsapp"
        ? "Sifarişlər WhatsApp üzərindən qəbul ediləcək."
        : "Sifarişlər sayt üzərindən qəbul ediləcək.",
  };
}

export async function updateAdminStoreOrderMethodAction(
  formData: FormData,
): Promise<WhatsAppOrderActionResult> {
  const current = await requireRole(["admin"], "/radmin/stores");
  const storeId = readString(formData, "storeId");
  const orderMethod = readOrderMethod(formData);
  const whatsappPhone = normalizeAzerbaijanPhone(readString(formData, "whatsappPhone"));

  if (!storeId) {
    return { ok: false, message: "Mağaza ID tapılmadı." };
  }

  const methodError = ensureWhatsappMethodAllowed(orderMethod, whatsappPhone);

  if (methodError) {
    return { ok: false, message: methodError };
  }

  const supabase = createSupabaseAdminClient();
  const { data: store } = await (supabase as any)
    .from("stores")
    .select("id,settings")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) {
    return { ok: false, message: "Mağaza tapılmadı." };
  }

  const previousSettings = readSettings(store.settings);
  const previousMethod = normalizeOrderMethod(previousSettings.orderMethod);
  const { error } = await (supabase as any)
    .from("stores")
    .update({
      settings: {
        ...previousSettings,
        orderMethod,
        whatsappPhone,
      },
    })
    .eq("id", storeId);

  if (error) {
    return { ok: false, message: error.message };
  }

  await recordAdminAudit({
    adminId: current.user.id,
    action: "RADMIN_SELLER_ORDER_METHOD_CHANGED",
    entityType: "stores",
    entityId: storeId,
    metadata: {
      old_value: previousMethod,
      new_value: orderMethod,
    },
  });
  revalidatePath("/radmin/stores");
  revalidatePath(`/radmin/stores/${storeId}`);
  revalidatePath("/checkout");
  revalidatePath("/cart");

  return {
    ok: true,
    message: "Satıcının sifariş qəbul etmə üsulu yeniləndi.",
  };
}

export async function updateWhatsAppOrderTemplateAction(
  formData: FormData,
): Promise<WhatsAppOrderActionResult> {
  const current = await requireRole(["admin"], "/radmin/whatsapp-orders");
  const template = normalizeWhatsAppTemplate(readString(formData, "template"));

  if (template.length < 10) {
    return { ok: false, message: "Şablon boş saxlanıla bilməz." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any).from("platform_settings").upsert({
    key: "whatsapp_order_template",
    value: {
      template,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  await recordAdminAudit({
    adminId: current.user.id,
    action: "WHATSAPP_ORDER_TEMPLATE_CHANGED",
    entityType: "platform_settings",
    entityId: "whatsapp_order_template",
    metadata: {
      template_length: template.length,
    },
  });
  revalidatePath("/radmin/whatsapp-orders");
  revalidatePath("/checkout");
  revalidatePath("/cart");

  return {
    ok: true,
    message: "WhatsApp sifariş şablonu saxlandı.",
  };
}
