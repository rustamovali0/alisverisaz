import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TelegramRateScope = "read" | "write" | "danger" | "password" | "unlock";

type TelegramRateRule = {
  scope: TelegramRateScope;
  telegramUserId: string | number;
  telegramChatId: string | number;
  maxAttempts: number;
  windowSeconds: number;
  blockSeconds?: number;
};

type TelegramRateBucket = {
  bucket_key: string;
  attempts: number;
  window_start: string;
  blocked_until: string | null;
};

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getBucketKey(input: TelegramRateRule) {
  return `telegram:${input.scope}:${hashValue(
    `${input.telegramUserId}:${input.telegramChatId}`,
  )}`;
}

function isWindowExpired(bucket: TelegramRateBucket, now: Date, windowSeconds: number) {
  return now.getTime() - new Date(bucket.window_start).getTime() >= windowSeconds * 1000;
}

export async function assertTelegramRateLimit(input: TelegramRateRule) {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const bucketKey = getBucketKey(input);
  const { data } = await (supabase as any)
    .from("telegram_rate_limits")
    .select("bucket_key,attempts,window_start,blocked_until")
    .eq("bucket_key", bucketKey)
    .maybeSingle();
  const bucket = data as TelegramRateBucket | null;
  const blockedUntil = bucket?.blocked_until ? new Date(bucket.blocked_until) : null;

  if (blockedUntil && blockedUntil > now) {
    return {
      ok: false,
      message: "🚫 Çox sayda cəhd edildi. Bir az sonra yenidən yoxlayın.",
    };
  }

  if (
    bucket &&
    !isWindowExpired(bucket, now, input.windowSeconds) &&
    bucket.attempts >= input.maxAttempts
  ) {
    return {
      ok: false,
      message: "🚫 Çox sayda cəhd edildi. Bir az sonra yenidən yoxlayın.",
    };
  }

  return {
    ok: true,
    message: "",
  };
}

export async function recordTelegramRateLimitAttempt(input: TelegramRateRule) {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const bucketKey = getBucketKey(input);
  const { data } = await (supabase as any)
    .from("telegram_rate_limits")
    .select("bucket_key,attempts,window_start,blocked_until")
    .eq("bucket_key", bucketKey)
    .maybeSingle();
  const bucket = data as TelegramRateBucket | null;
  const expired = !bucket || isWindowExpired(bucket, now, input.windowSeconds);
  const attempts = expired ? 1 : Number(bucket.attempts ?? 0) + 1;
  const blockedUntil =
    attempts >= input.maxAttempts
      ? new Date(now.getTime() + (input.blockSeconds ?? input.windowSeconds) * 1000)
          .toISOString()
      : null;

  await (supabase as any).from("telegram_rate_limits").upsert({
    bucket_key: bucketKey,
    scope: input.scope,
    attempts,
    window_start: expired ? now.toISOString() : bucket.window_start,
    blocked_until: blockedUntil,
  });

  return {
    isBlocked: Boolean(blockedUntil),
  };
}

export async function resetTelegramRateLimit(input: Pick<TelegramRateRule, "scope" | "telegramUserId" | "telegramChatId">) {
  const supabase = createSupabaseAdminClient();
  await (supabase as any)
    .from("telegram_rate_limits")
    .update({
      attempts: 0,
      blocked_until: null,
      window_start: new Date().toISOString(),
    })
    .eq(
      "bucket_key",
      getBucketKey({
        ...input,
        maxAttempts: 1,
        windowSeconds: 1,
      }),
    );
}
