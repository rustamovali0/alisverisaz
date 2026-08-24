import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { serverEnv } from "@/lib/config/env.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RateLimitBucket = {
  bucket_key: string;
  attempts: number;
  window_start: string;
  blocked_until: string | null;
};

type RateLimitRule = {
  endpoint: "login" | "password_reset" | "guest_checkout";
  identifier: string;
  maxAttempts: number;
  windowSeconds: number;
  blockSeconds?: number;
};

type BucketInput = {
  endpoint: string;
  bucketType: "ip" | "identifier";
  identifierHash: string | null;
  ipHash: string | null;
};

const GENERIC_CAPTCHA_ERROR = "Təhlükəsizlik yoxlaması alınmadı. Yenidən cəhd edin.";
const GENERIC_RATE_LIMIT_ERROR =
  "Brut-force detected. 2 dəqiqə sonra yenidən cəhd edin.";

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isSafeIp(value: string) {
  return /^[a-fA-F0-9:.]{3,45}$/.test(value);
}

function readForwardedIp(value: string | null) {
  const first = value?.split(",")[0]?.trim() ?? "";

  return isSafeIp(first) ? first : "";
}

export async function getClientIp() {
  const headerList = await headers();
  const directIp =
    readForwardedIp(headerList.get("cf-connecting-ip")) ||
    readForwardedIp(headerList.get("true-client-ip")) ||
    readForwardedIp(headerList.get("x-real-ip")) ||
    readForwardedIp(headerList.get("x-vercel-forwarded-for")) ||
    readForwardedIp(headerList.get("x-forwarded-for"));

  return directIp || "unknown";
}

export function readCaptchaToken(formData: FormData) {
  const value = formData.get("captchaToken");

  return typeof value === "string" ? value.trim() : "";
}

export async function verifyCaptchaToken(token: string, remoteIp: string) {
  if (!token || token.length > 4096) {
    return {
      ok: false,
      message: GENERIC_CAPTCHA_ERROR,
    };
  }

  if (!serverEnv.hasTurnstileConfig) {
    return {
      ok: false,
      message: "CAPTCHA ayarları tamamlanmayıb.",
    };
  }

  try {
    const body = new URLSearchParams({
      secret: serverEnv.turnstileSecretKey,
      response: token,
    });

    if (remoteIp !== "unknown") {
      body.set("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
      },
    );
    const data = (await response.json()) as { success?: boolean };

    if (!response.ok || data.success !== true) {
      return {
        ok: false,
        message: GENERIC_CAPTCHA_ERROR,
      };
    }

    return {
      ok: true,
      message: "",
    };
  } catch {
    return {
      ok: false,
      message: GENERIC_CAPTCHA_ERROR,
    };
  }
}

function getBucketKey(input: BucketInput) {
  const value =
    input.bucketType === "ip"
      ? input.ipHash ?? "unknown"
      : input.identifierHash ?? "unknown";

  return `auth:${input.endpoint}:${input.bucketType}:${value}`;
}

function getBucketInputs(input: {
  endpoint: string;
  identifier: string;
  ip: string;
}) {
  const identifierHash = hashValue(input.identifier || "unknown");
  const ipHash = hashValue(input.ip || "unknown");

  return [
    {
      endpoint: input.endpoint,
      bucketType: "ip" as const,
      identifierHash: null,
      ipHash,
    },
    {
      endpoint: input.endpoint,
      bucketType: "identifier" as const,
      identifierHash,
      ipHash: null,
    },
  ];
}

function isWindowExpired(bucket: RateLimitBucket, now: Date, windowSeconds: number) {
  return now.getTime() - new Date(bucket.window_start).getTime() >= windowSeconds * 1000;
}

export async function assertAuthRateLimit(input: RateLimitRule & { ip: string }) {
  const supabaseAdmin = createSupabaseAdminClient();
  const now = new Date();
  const bucketInputs = getBucketInputs({
    endpoint: input.endpoint,
    identifier: input.identifier,
    ip: input.ip,
  });
  const bucketKeys = bucketInputs.map(getBucketKey);
  const { data } = await (supabaseAdmin as any)
    .from("auth_rate_limits")
    .select("bucket_key,attempts,window_start,blocked_until")
    .in("bucket_key", bucketKeys);
  const buckets = new Map(
    ((data ?? []) as RateLimitBucket[]).map((bucket) => [bucket.bucket_key, bucket]),
  );

  for (const bucketInput of bucketInputs) {
    const bucketKey = getBucketKey(bucketInput);
    const bucket = buckets.get(bucketKey);
    const blockedUntil = bucket?.blocked_until ? new Date(bucket.blocked_until) : null;

    if (blockedUntil && blockedUntil > now) {
      return {
        ok: false,
        message: GENERIC_RATE_LIMIT_ERROR,
      };
    }

    if (
      bucket &&
      !isWindowExpired(bucket, now, input.windowSeconds) &&
      bucket.attempts >= input.maxAttempts
    ) {
      return {
        ok: false,
        message: GENERIC_RATE_LIMIT_ERROR,
      };
    }
  }

  return {
    ok: true,
    message: "",
  };
}

export async function recordAuthRateLimitAttempt(
  input: RateLimitRule & { ip: string },
) {
  const supabaseAdmin = createSupabaseAdminClient();
  const now = new Date();
  const windowStart = now.toISOString();
  const blockMs = (input.blockSeconds ?? input.windowSeconds) * 1000;
  const bucketInputs = getBucketInputs({
    endpoint: input.endpoint,
    identifier: input.identifier,
    ip: input.ip,
  });
  let isBlocked = false;

  for (const bucketInput of bucketInputs) {
    const bucketKey = getBucketKey(bucketInput);
    const { data } = await (supabaseAdmin as any)
      .from("auth_rate_limits")
      .select("bucket_key,attempts,window_start,blocked_until")
      .eq("bucket_key", bucketKey)
      .maybeSingle();
    const bucket = data as RateLimitBucket | null;
    const expired = !bucket || isWindowExpired(bucket, now, input.windowSeconds);
    const attempts = expired ? 1 : Number(bucket.attempts ?? 0) + 1;
    const blockedUntil =
      attempts >= input.maxAttempts
        ? new Date(now.getTime() + blockMs).toISOString()
        : null;
    isBlocked = isBlocked || Boolean(blockedUntil);

    await (supabaseAdmin as any).from("auth_rate_limits").upsert({
      bucket_key: bucketKey,
      endpoint: input.endpoint,
      bucket_type: bucketInput.bucketType,
      identifier_hash: bucketInput.identifierHash,
      ip_hash: bucketInput.ipHash,
      attempts,
      window_start: expired ? windowStart : bucket.window_start,
      blocked_until: blockedUntil,
    });
  }

  return {
    isBlocked,
    message: isBlocked ? GENERIC_RATE_LIMIT_ERROR : "",
  };
}

export async function resetAuthRateLimit(input: {
  endpoint: "login" | "password_reset" | "guest_checkout";
  identifier: string;
  ip: string;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const bucketKeys = getBucketInputs(input).map(getBucketKey);

  await (supabaseAdmin as any)
    .from("auth_rate_limits")
    .update({
      attempts: 0,
      blocked_until: null,
      window_start: new Date().toISOString(),
    })
    .in("bucket_key", bucketKeys);
}
