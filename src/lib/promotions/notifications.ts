import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram/api";
import type { PromotionRequest, PromotionTargetType } from "@/lib/promotions/types";
import { clientEnv } from "@/lib/config/env.client";

function targetLabel(type: PromotionTargetType) {
  return type === "store" ? "Mağaza" : "Məhsul";
}

function formatMoney(amount: number, currency = "AZN") {
  return `${amount.toFixed(2)} ${currency}`;
}

async function createAdminPromotionNotifications(request: PromotionRequest) {
  const supabase = createSupabaseAdminClient();
  const { data: admins } = await (supabase as any)
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  const rows = ((admins ?? []) as Array<{ id: string }>)
    .filter((admin) => admin.id)
    .map((admin) => ({
      user_id: admin.id,
      type: "promotion_request",
      title: "Yeni önə çıxarma sorğusu",
      body: `${targetLabel(request.targetType)} üçün ${request.requestedDays} günlük sorğu gəldi.`,
      data: {
        source: "promotion_request",
        promotion_request_id: request.id,
        target_type: request.targetType,
        store_id: request.storeId,
        product_id: request.productId,
        href: "/radmin/promotions",
      },
    }));

  if (rows.length > 0) {
    await (supabase as any).from("notifications").insert(rows);
  }
}

export async function notifyPromotionRequestSubmitted(request: PromotionRequest) {
  const [, telegram] = await Promise.allSettled([
    createAdminPromotionNotifications(request),
    sendTelegramMessage({
    text: [
      "📌 <b>Yeni önə çıxarma sorğusu</b>",
      `Tip: <b>${escapeHtml(targetLabel(request.targetType))}</b>`,
      `Mağaza: ${escapeHtml(request.storeName)}`,
      request.productName ? `Məhsul: ${escapeHtml(request.productName)}` : null,
      `Müddət: ${escapeHtml(request.requestedDays)} gün`,
      `Qiymət: <b>${escapeHtml(formatMoney(request.totalAmount, request.currency))}</b>`,
      request.requesterEmail ? `Satıcı: ${escapeHtml(request.requesterEmail)}` : null,
      request.sellerNote ? `Qeyd: ${escapeHtml(request.sellerNote)}` : null,
      `RAdmin: ${escapeHtml(new URL("/radmin/promotions", clientEnv.appUrl).toString())}`,
    ]
      .filter(Boolean)
      .join("\n"),
    }),
  ]);
  return { telegramSent: telegram.status === "fulfilled" && telegram.value === true };
}

export async function notifyPromotionRequestResolved(request: PromotionRequest) {
  const supabase = createSupabaseAdminClient();
  const approved = request.status === "approved";

  await (supabase as any).from("notifications").insert({
    user_id: request.requesterId,
    type: approved ? "promotion_approved" : "promotion_rejected",
    title: approved ? "Önə çıxarma aktiv edildi" : "Önə çıxarma rədd edildi",
    body: approved
      ? `${targetLabel(request.targetType)} önə çıxarıldı.`
      : request.adminNote || "Sorğu admin tərəfindən rədd edildi.",
    data: {
      source: "promotion_request",
      promotion_request_id: request.id,
      target_type: request.targetType,
      store_id: request.storeId,
      product_id: request.productId,
      href: "/store/dashboard/promotions",
    },
  });
}
