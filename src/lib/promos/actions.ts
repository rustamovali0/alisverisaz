"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { recordAdminAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { siteConfig } from "@/lib/config/site";
import { sendPromoCreatedEmail } from "@/lib/email/promo";
import { trackActivityEvent } from "@/lib/activity/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PromoActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const PROMO_CODE_PATTERN = /^[A-Z0-9_-]{1,40}$/;
const PROMO_NOTIFICATION_BATCH_SIZE = 100;
const AZERBAIJAN_TIMEZONE_OFFSET = "+04:00";
const DEFAULT_PROMO_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function normalizePromoCode(value: string) {
  return value.trim().toUpperCase();
}

function readBoolean(formData: FormData, key: string) {
  const value = formData.get(key);

  return value === "on" || value === "true" || value === "1";
}

function readPercent(value: string) {
  const numberValue = Number(value.replace(",", "."));

  return Number.isFinite(numberValue) ? Math.round(numberValue * 100) / 100 : Number.NaN;
}

function parseDateInput(value: string) {
  if (!value) {
    return null;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00${AZERBAIJAN_TIMEZONE_OFFSET}`
    : value;
  const timestamp = Date.parse(normalizedValue);

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

async function getActionStore(input: {
  storeId: string;
  actorId: string;
  actorRole: "seller" | "admin";
}) {
  const supabase = createSupabaseAdminClient();
  let query = (supabase as any)
    .from("stores")
    .select("id,name,slug,owner_id")
    .eq("id", input.storeId);

  if (input.actorRole === "seller") {
    query = query.eq("owner_id", input.actorId);
  }

  const { data: store } = await query.maybeSingle();

  return store as
    | {
        id: string;
        name: string | null;
        slug: string | null;
        owner_id: string | null;
      }
    | null;
}

async function getPromoForAction(input: {
  promoId: string;
  actorId: string;
  actorRole: "seller" | "admin";
}) {
  const supabase = createSupabaseAdminClient();
  let query = (supabase as any)
    .from("seller_promo_codes")
    .select("id,seller_id,store_id,code,discount_percent,starts_at,ends_at,is_active,promo_notification_sent_at,deleted_at,stores(id,name,slug,owner_id)")
    .eq("id", input.promoId)
    .is("deleted_at", null);

  if (input.actorRole === "seller") {
    query = query.eq("seller_id", input.actorId);
  }

  const { data: promo } = await query.maybeSingle();

  return promo as any | null;
}

function schedulePromoAudienceNotification(input: {
  promoId: string;
  storeName: string;
  storeSlug: string;
  code: string;
  discountPercent: number;
  endsAt: string | null;
}) {
  const work = async () => {
    const supabase = createSupabaseAdminClient();
    const storeUrl = `${siteConfig.url}/${input.storeSlug}`;
    let from = 0;

    while (true) {
      const to = from + PROMO_NOTIFICATION_BATCH_SIZE - 1;
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id,email")
        .eq("role", "customer")
        .range(from, to);
      const recipients = (profiles ?? []) as Array<{ id: string; email: string | null }>;

      if (recipients.length === 0) {
        break;
      }

      const title = `${input.storeName}-də ${input.discountPercent}% endirim`;
      const body = `${input.code} promo kodundan istifadə edin.`;

      await (supabase as any).from("notifications").insert(
        recipients.map((profile) => ({
          user_id: profile.id,
          type: "promo",
          title,
          body,
          data: {
            promo_id: input.promoId,
            promo_code: input.code,
            store_slug: input.storeSlug,
            href: `/${input.storeSlug}`,
          },
        })),
      );

      await Promise.allSettled(
        recipients
          .filter((profile) => Boolean(profile.email))
          .map((profile) =>
            sendPromoCreatedEmail({
              to: profile.email!,
              storeName: input.storeName,
              code: input.code,
              discountPercent: input.discountPercent,
              endsAt: input.endsAt,
              storeUrl,
            }),
          ),
      );

      if (recipients.length < PROMO_NOTIFICATION_BATCH_SIZE) {
        break;
      }

      from += PROMO_NOTIFICATION_BATCH_SIZE;
    }
  };

  try {
    after(() => {
      void work();
    });
  } catch {
    void work();
  }
}

async function markNotificationSentAndSchedule(input: {
  promoId: string;
  storeName: string;
  storeSlug: string;
  code: string;
  discountPercent: number;
  endsAt: string | null;
  shouldSend: boolean;
}) {
  if (!input.shouldSend) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const sentAt = new Date().toISOString();
  const { data: promo } = await (supabase as any)
    .from("seller_promo_codes")
    .update({ promo_notification_sent_at: sentAt })
    .eq("id", input.promoId)
    .is("promo_notification_sent_at", null)
    .select("id")
    .maybeSingle();

  if (!promo) {
    return;
  }

  schedulePromoAudienceNotification(input);
}

async function logPromoAction(input: {
  actorId: string;
  actorRole: "seller" | "admin";
  action: "PROMO_CREATED" | "PROMO_UPDATED" | "PROMO_DELETED" | "PROMO_ENABLED" | "PROMO_DISABLED";
  storeId: string | null;
  sellerId: string | null;
  promoId: string | null;
  metadata?: Record<string, unknown>;
}) {
  const eventType =
    input.action === "PROMO_CREATED"
      ? "promo_created"
      : input.action === "PROMO_UPDATED"
        ? "promo_updated"
        : input.action === "PROMO_DELETED"
          ? "promo_deleted"
          : input.action === "PROMO_ENABLED"
            ? "promo_enabled"
            : "promo_disabled";

  await trackActivityEvent({
    eventType,
    actorId: input.actorId,
    storeId: input.storeId,
    metadata: {
      title: input.action,
      actor_type: input.actorRole,
      seller_id: input.sellerId,
      promo_id: input.promoId,
      ...(input.metadata ?? {}),
    },
  });

  if (input.actorRole === "admin") {
    await recordAdminAudit({
      adminId: input.actorId,
      action: input.action,
      entityType: "seller_promo_codes",
      entityId: input.promoId,
      metadata: {
        actor_type: input.actorRole,
        seller_id: input.sellerId,
        store_id: input.storeId,
        ...(input.metadata ?? {}),
      },
    });
  }
}

export async function saveSellerPromoCodeAction(
  formData: FormData,
): Promise<PromoActionResult> {
  const mode = readString(formData, "mode") === "admin" ? "admin" : "seller";
  const current =
    mode === "admin"
      ? await requireRole(["admin"], "/radmin/promos")
      : await requireRole(["seller"], "/store/dashboard/promos");
  const storeId = readString(formData, "storeId");
  const promoId = readString(formData, "promoId");
  const code = normalizePromoCode(readString(formData, "code"));
  const discountPercent = readPercent(readString(formData, "discountPercent"));
  const startsAtInput = readString(formData, "startsAt");
  const parsedStartsAt = startsAtInput ? parseDateInput(startsAtInput) : null;
  const startsAt = parsedStartsAt ?? new Date().toISOString();
  const endsAtInput = readString(formData, "endsAt");
  const endsAt = endsAtInput
    ? parseDateInput(endsAtInput)
    : new Date(Date.parse(startsAt) + DEFAULT_PROMO_DURATION_MS).toISOString();
  const isActive = readBoolean(formData, "isActive");
  const actorRole = mode === "admin" ? "admin" : "seller";

  if (!storeId) {
    return { ok: false, message: "Mağaza seçilməyib." };
  }

  if (!PROMO_CODE_PATTERN.test(code)) {
    return { ok: false, message: "Promo kod boş ola bilməz və yalnız hərf, rəqəm, _ və - istifadə edilə bilər." };
  }

  if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    return { ok: false, message: "Endirim faizi 1–100 arasında olmalıdır." };
  }

  if (!startsAt || !endsAt) {
    return { ok: false, message: "Tarix formatı düzgün deyil." };
  }

  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return { ok: false, message: "Bitmə tarixi başlama tarixindən əvvəl ola bilməz." };
  }

  const store = await getActionStore({
    storeId,
    actorId: current.user.id,
    actorRole,
  });

  if (!store?.owner_id) {
    return { ok: false, message: "Mağaza tapılmadı." };
  }

  const supabase = createSupabaseAdminClient();
  const payload = {
    seller_id: store.owner_id,
    store_id: store.id,
    code,
    code_normalized: code,
    discount_percent: discountPercent,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: isActive,
  };

  if (promoId) {
    const existing = await getPromoForAction({
      promoId,
      actorId: current.user.id,
      actorRole,
    });

    if (!existing || existing.seller_id !== store.owner_id) {
      return { ok: false, message: "Promo kod tapılmadı." };
    }

    const { error } = await (supabase as any)
      .from("seller_promo_codes")
      .update(payload)
      .eq("id", promoId)
      .is("deleted_at", null);

    if (error) {
      return {
        ok: false,
        message: error.code === "23505" ? "Bu promo kod artıq mövcuddur." : error.message,
      };
    }

    const shouldSendNotification =
      isActive && !existing.is_active && !existing.promo_notification_sent_at;

    await markNotificationSentAndSchedule({
      promoId,
      storeName: store.name ?? "Mağaza",
      storeSlug: store.slug ?? "",
      code,
      discountPercent,
      endsAt,
      shouldSend: shouldSendNotification,
    });
    await logPromoAction({
      actorId: current.user.id,
      actorRole,
      action: existing.is_active === isActive ? "PROMO_UPDATED" : isActive ? "PROMO_ENABLED" : "PROMO_DISABLED",
      storeId: store.id,
      sellerId: store.owner_id,
      promoId,
      metadata: {
        code,
        discount_percent: discountPercent,
      },
    });
  } else {
    const { data: inserted, error } = await (supabase as any)
      .from("seller_promo_codes")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        message: error.code === "23505" ? "Bu promo kod artıq mövcuddur." : error.message,
      };
    }

    const newPromoId = inserted?.id as string | undefined;

    if (newPromoId) {
      await markNotificationSentAndSchedule({
        promoId: newPromoId,
        storeName: store.name ?? "Mağaza",
        storeSlug: store.slug ?? "",
        code,
        discountPercent,
        endsAt,
        shouldSend: isActive,
      });
      await logPromoAction({
        actorId: current.user.id,
        actorRole,
        action: "PROMO_CREATED",
        storeId: store.id,
        sellerId: store.owner_id,
        promoId: newPromoId,
        metadata: {
          code,
          discount_percent: discountPercent,
        },
      });
    }
  }

  revalidatePath("/store/dashboard/promos");
  revalidatePath("/radmin/promos");
  revalidatePath(`/radmin/promos/${store.id}`);
  revalidatePath("/checkout");
  revalidatePath("/cart");

  return {
    ok: true,
    message: promoId ? "Promo kod yeniləndi." : "Promo kod yaradıldı.",
  };
}

export async function toggleSellerPromoCodeAction(
  formData: FormData,
): Promise<PromoActionResult> {
  const mode = readString(formData, "mode") === "admin" ? "admin" : "seller";
  const current =
    mode === "admin"
      ? await requireRole(["admin"], "/radmin/promos")
      : await requireRole(["seller"], "/store/dashboard/promos");
  const promoId = readString(formData, "promoId");
  const isActive = readBoolean(formData, "isActive");
  const actorRole = mode === "admin" ? "admin" : "seller";
  const promo = await getPromoForAction({
    promoId,
    actorId: current.user.id,
    actorRole,
  });

  if (!promo) {
    return { ok: false, message: "Promo kod tapılmadı." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("seller_promo_codes")
    .update({ is_active: isActive })
    .eq("id", promo.id)
    .is("deleted_at", null);

  if (error) {
    return { ok: false, message: error.message };
  }

  const store = Array.isArray(promo.stores) ? promo.stores[0] : promo.stores;

  await markNotificationSentAndSchedule({
    promoId: promo.id,
    storeName: store?.name ?? "Mağaza",
    storeSlug: store?.slug ?? "",
    code: promo.code,
    discountPercent: Number(promo.discount_percent ?? 0),
    endsAt: promo.ends_at ?? null,
    shouldSend: isActive && !promo.is_active && !promo.promo_notification_sent_at,
  });
  await logPromoAction({
    actorId: current.user.id,
    actorRole,
    action: isActive ? "PROMO_ENABLED" : "PROMO_DISABLED",
    storeId: promo.store_id,
    sellerId: promo.seller_id,
    promoId: promo.id,
    metadata: {
      code: promo.code,
      old_value: promo.is_active,
      new_value: isActive,
    },
  });
  revalidatePath("/store/dashboard/promos");
  revalidatePath("/radmin/promos");
  revalidatePath(`/radmin/promos/${promo.store_id}`);

  return {
    ok: true,
    message: isActive ? "Promo kod aktiv edildi." : "Promo kod deaktiv edildi.",
  };
}

export async function deleteSellerPromoCodeAction(
  formData: FormData,
): Promise<PromoActionResult> {
  const mode = readString(formData, "mode") === "admin" ? "admin" : "seller";
  const current =
    mode === "admin"
      ? await requireRole(["admin"], "/radmin/promos")
      : await requireRole(["seller"], "/store/dashboard/promos");
  const promoId = readString(formData, "promoId");
  const actorRole = mode === "admin" ? "admin" : "seller";
  const promo = await getPromoForAction({
    promoId,
    actorId: current.user.id,
    actorRole,
  });

  if (!promo) {
    return { ok: false, message: "Promo kod tapılmadı." };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase as any)
    .from("seller_promo_codes")
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", promo.id)
    .is("deleted_at", null);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logPromoAction({
    actorId: current.user.id,
    actorRole,
    action: "PROMO_DELETED",
    storeId: promo.store_id,
    sellerId: promo.seller_id,
    promoId: promo.id,
    metadata: {
      code: promo.code,
    },
  });
  revalidatePath("/store/dashboard/promos");
  revalidatePath("/radmin/promos");
  revalidatePath(`/radmin/promos/${promo.store_id}`);

  return {
    ok: true,
    message: "Promo kod silindi.",
  };
}
