"use server";

import { revalidatePath } from "next/cache";

import { recordAdminAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { normalizeSellerDailyAlertConfig } from "@/lib/seller-alerts/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SellerDailyAlertActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function updateSellerDailyAlertAction(
  formData: FormData,
): Promise<SellerDailyAlertActionResult> {
  const current = await requireRole(["admin"], "/radmin/announcements");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const audience = formData.get("audience") === "missing_assets"
    ? "missing_assets"
    : "all_sellers";

  if (!title || !body || !ctaLabel) {
    return { ok: false, message: "Başlıq, mətn və düymə adı boş ola bilməz." };
  }

  if (title.length > 120 || body.length > 500 || ctaLabel.length > 60) {
    return { ok: false, message: "Alert mətnlərindən biri icazə verilən uzunluğu keçir." };
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
    return { ok: false, message: "Göstərilmə saatlarını düzgün seçin." };
  }

  const value = normalizeSellerDailyAlertConfig({
    enabled: formData.get("enabled") === "on",
    title,
    body,
    audience,
    startTime,
    endTime,
    ctaLabel,
    version: `seller-alert-${Date.now()}`,
  });
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any).from("platform_settings").upsert({
    key: "seller_daily_alert",
    value,
  }, { onConflict: "key" });

  if (error) {
    return { ok: false, message: "Gündəlik satıcı alerti saxlanmadı." };
  }

  revalidatePath("/radmin/announcements");
  revalidatePath("/store/dashboard", "layout");
  await recordAdminAudit({
    adminId: current.user.id,
    action: "ADMIN_SELLER_DAILY_ALERT_UPDATE",
    entityType: "platform_settings",
    entityId: null,
    metadata: {
      enabled: value.enabled,
      audience: value.audience,
      startTime: value.startTime,
      endTime: value.endTime,
      version: value.version,
    },
  });

  return {
    ok: true,
    message: value.enabled
      ? "Gündəlik satıcı alerti aktiv edildi."
      : "Gündəlik satıcı alerti deaktiv edildi.",
  };
}
