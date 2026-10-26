import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SellerDailyAlertAudience = "all_sellers" | "missing_assets";

export type SellerDailyAlertConfig = {
  enabled: boolean;
  title: string;
  body: string;
  audience: SellerDailyAlertAudience;
  startTime: string;
  endTime: string;
  ctaLabel: string;
  version: string;
};

export const DEFAULT_SELLER_DAILY_ALERT: SellerDailyAlertConfig = {
  enabled: true,
  title: "Mağazanızın görünüşünü tamamlayın",
  body: "Müştərilərə daha etibarlı görünmək üçün mağazanıza logo və banner əlavə edin.",
  audience: "all_sellers",
  startTime: "09:00",
  endTime: "23:59",
  ctaLabel: "Mağaza ayarlarını aç",
  version: "seller-branding-reminder-v1",
};

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function nonEmptyString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeSellerDailyAlertConfig(value: unknown): SellerDailyAlertConfig {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    enabled: typeof source.enabled === "boolean" ? source.enabled : DEFAULT_SELLER_DAILY_ALERT.enabled,
    title: nonEmptyString(source.title, DEFAULT_SELLER_DAILY_ALERT.title),
    body: nonEmptyString(source.body, DEFAULT_SELLER_DAILY_ALERT.body),
    audience: source.audience === "missing_assets" ? "missing_assets" : "all_sellers",
    startTime: isTime(source.startTime) ? source.startTime : DEFAULT_SELLER_DAILY_ALERT.startTime,
    endTime: isTime(source.endTime) ? source.endTime : DEFAULT_SELLER_DAILY_ALERT.endTime,
    ctaLabel: nonEmptyString(source.ctaLabel, DEFAULT_SELLER_DAILY_ALERT.ctaLabel),
    version: nonEmptyString(source.version, DEFAULT_SELLER_DAILY_ALERT.version),
  };
}

export async function getSellerDailyAlertConfig() {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "seller_daily_alert")
    .maybeSingle();

  return normalizeSellerDailyAlertConfig(data?.value);
}
