import "server-only";

import {
  DEFAULT_WHATSAPP_ORDER_TEMPLATE,
  normalizeOrderMethod,
  normalizeWhatsAppTemplate,
  type OrderMethod,
} from "@/lib/whatsapp-orders/template";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StoreOrderMethodSettings = {
  storeId: string;
  orderMethod: OrderMethod;
  whatsappPhone: string;
};

function readSettings(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readStoreOrderMethodSettings(input: {
  id: string;
  settings?: unknown;
}): StoreOrderMethodSettings {
  const settings = readSettings(input.settings);
  const whatsappPhone =
    typeof settings.whatsappPhone === "string" ? settings.whatsappPhone : "";

  return {
    storeId: input.id,
    orderMethod: normalizeOrderMethod(settings.orderMethod),
    whatsappPhone,
  };
}

export async function getGlobalWhatsAppOrderTemplate() {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "whatsapp_order_template")
    .maybeSingle();

  return normalizeWhatsAppTemplate(data?.value?.template);
}

export async function getSellerStoreOrderMethodSettings(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("stores")
    .select("id,settings")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ? readStoreOrderMethodSettings(data) : null;
}

export async function getWhatsAppOrderTemplateForAdmin() {
  const template = await getGlobalWhatsAppOrderTemplate();

  return template || DEFAULT_WHATSAPP_ORDER_TEMPLATE;
}
