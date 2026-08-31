import { headers } from "next/headers";
import { after } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ActivityEventType =
  | "product_view"
  | "store_view"
  | "user_register"
  | "user_login"
  | "user_logout"
  | "order_created"
  | "order_status_updated"
  | "order_deleted"
  | "message_created"
  | "profile_updated"
  | "address_saved"
  | "notifications_marked_read"
  | "notifications_deleted"
  | "analytics_deleted"
  | "activity_cleared"
  | "seller_order_method_changed"
  | "whatsapp_order_intent"
  | "promo_created"
  | "promo_updated"
  | "promo_deleted"
  | "promo_enabled"
  | "promo_disabled";

function getDeviceType(userAgent: string | null) {
  const value = userAgent?.toLowerCase() ?? "";

  if (!value) {
    return "unknown";
  }

  if (value.includes("ipad") || value.includes("tablet")) {
    return "tablet";
  }

  if (value.includes("mobile") || value.includes("iphone") || value.includes("android")) {
    return "mobile";
  }

  return "desktop";
}

function getDeviceLabel(userAgent: string | null) {
  const value = userAgent?.toLowerCase() ?? "";

  if (!value) {
    return "Naməlum cihaz";
  }

  const browser =
    value.includes("edg/")
      ? "Edge"
      : value.includes("chrome/")
        ? "Chrome"
        : value.includes("safari/")
          ? "Safari"
          : value.includes("firefox/")
            ? "Firefox"
            : "Brauzer";
  const platform =
    value.includes("iphone")
      ? "iPhone"
      : value.includes("ipad")
        ? "iPad"
        : value.includes("android")
          ? "Android"
          : value.includes("mac os")
            ? "macOS"
            : value.includes("windows")
              ? "Windows"
              : "Cihaz";

  return `${platform} · ${browser}`;
}

async function getRequestMetadata() {
  try {
    const requestHeaders = await headers();
    const userAgent = requestHeaders.get("user-agent");
    const forwardedFor = requestHeaders.get("x-forwarded-for");

    return {
      ip_address:
        requestHeaders.get("x-real-ip") ??
        forwardedFor?.split(",")[0]?.trim() ??
        null,
      user_agent: userAgent,
      device: getDeviceLabel(userAgent),
      device_type: getDeviceType(userAgent),
    };
  } catch {
    return {
      ip_address: null,
      user_agent: null,
      device: "Server",
      device_type: "unknown",
    };
  }
}

function scheduleActivityWrite(work: () => Promise<void>) {
  try {
    after(() => {
      void work();
    });
  } catch {
    void work();
  }
}

export async function trackActivityEvent(input: {
  eventType: ActivityEventType;
  actorId?: string | null;
  storeId?: string | null;
  productId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const requestMetadata = await getRequestMetadata();
    const payload = {
      event_type: input.eventType,
      actor_id: input.actorId ?? null,
      store_id: input.storeId ?? null,
      product_id: input.productId ?? null,
      metadata: {
        ...requestMetadata,
        ...(input.metadata ?? {}),
      },
    };

    scheduleActivityWrite(async () => {
      const supabase = createSupabaseAdminClient();
      await (supabase as any).from("activity_events").insert(payload);
    });
  } catch {
    // Activity tracking must never block the customer-facing flow.
  }
}
