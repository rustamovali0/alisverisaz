import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SECRET_KEY_PATTERN =
  /(password|token|secret|cookie|otp|card|authorization|apikey|api_key|access_key)/i;

function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadata);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SECRET_KEY_PATTERN.test(key))
      .map(([key, nested]) => [key, sanitizeMetadata(nested)]),
  );
}

export async function recordAdminAudit(input: {
  action: string;
  adminId?: string | null;
  entityType?: string;
  entityId?: string | null;
  success?: boolean;
  telegramUserId?: string | number | null;
  telegramChatId?: string | number | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    await (supabase as any).from("admin_audit_logs").insert({
      admin_id: input.adminId ?? null,
      action: input.action,
      entity_type: input.entityType ?? "system",
      entity_id: input.entityId ?? null,
      success: input.success ?? true,
      telegram_user_id:
        input.telegramUserId === null || input.telegramUserId === undefined
          ? null
          : String(input.telegramUserId),
      telegram_chat_id:
        input.telegramChatId === null || input.telegramChatId === undefined
          ? null
          : String(input.telegramChatId),
      metadata: sanitizeMetadata(input.metadata ?? {}),
    });
  } catch {
    // Audit logging must not break the primary request flow.
  }
}
