import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ActivityEventType =
  | "product_view"
  | "store_view"
  | "user_register"
  | "user_login"
  | "user_logout"
  | "order_created"
  | "message_created";

export async function trackActivityEvent(input: {
  eventType: ActivityEventType;
  actorId?: string | null;
  storeId?: string | null;
  productId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    await (supabase as any).from("activity_events").insert({
      event_type: input.eventType,
      actor_id: input.actorId ?? null,
      store_id: input.storeId ?? null,
      product_id: input.productId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Activity tracking must never block the customer-facing flow.
  }
}
