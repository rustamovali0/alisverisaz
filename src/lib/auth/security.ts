import { recordDangerRisk } from "@/lib/security/danger-auto";
import { securityEvent } from "@/lib/security/events";
import { headers } from "next/headers";

import { serverEnv } from "@/lib/config/env.server";
import { consumeRateLimit, clearRateLimit } from "@/lib/security/rate-limit";
import { resolveClientIp } from "@/lib/security/client-ip";

type RateLimitRule = {
  endpoint:
    | "admin_mfa"
    | "login"
    | "register"
    | "password_reset"
    | "guest_checkout"
    | "marketplace_search"
    | "support_message";
  identifier: string;
  maxAttempts: number;
  windowSeconds: number;
  blockSeconds?: number;
};

export async function getClientIp() {
  return resolveClientIp(await headers());
}
const GENERIC_CAPTCHA_ERROR =
  "Təhlükəsizlik yoxlaması alınmadı. Yenidən cəhd edin.";

export function readCaptchaToken(formData: FormData) {
  const value = formData.get("captchaToken");

  return typeof value === "string" ? value.trim() : "";
}

export async function verifyCaptchaToken(
  token: string,
  remoteIp: string,
  action: string | readonly string[] = "login",
  expectedHostname?: string,
) {
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

    if (remoteIp !== "unknown" && !remoteIp.includes("/64")) {
      body.set("remoteip", remoteIp);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        signal: AbortSignal.timeout(5000),
      },
    );
    const data = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };

    const appHost = new URL(
      process.env.NEXT_PUBLIC_APP_URL || "https://alisveris.az",
    ).hostname;
    const allowed = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || appHost)
      .split(",")
      .map((host) => host.trim());
    const visitHostAllowed = action === "danger_visit" && expectedHostname && data.hostname === expectedHostname &&
      (allowed.includes(expectedHostname) || allowed.some(root => expectedHostname.endsWith("." + root) && expectedHostname.slice(0, -(root.length + 1)).match(/^[a-z0-9][a-z0-9-]{0,62}$/)));
    if (
      !response.ok ||
      data.success !== true ||
      !data.hostname ||
      !(allowed.includes(data.hostname) || visitHostAllowed) ||
      (expectedHostname && data.hostname !== expectedHostname) ||
      !(Array.isArray(action)
        ? action.includes(data.action || "")
        : data.action === action)
    ) {
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

// Consume BEFORE the operation, atomically, rather than read/check/upsert.
// The legacy record hook remains a no-op so existing callers do not count twice.
export async function assertAuthRateLimit(
  input: RateLimitRule & { ip: string },
) {
  const ip = await consumeRateLimit(
    `${input.endpoint}:ip`,
    input.ip,
    input.endpoint === "login" ? 200 : Math.max(30, input.maxAttempts * 10),
    input.windowSeconds,
  );
  if (!ip.ok) { if (ip.status === 429 && ["login", "register", "password_reset"].includes(input.endpoint)) await recordDangerRisk("auth_rate_block", input.ip); return ip; }
  const identifier = await consumeRateLimit(
    `${input.endpoint}:identifier`,
    input.identifier,
    input.maxAttempts,
    input.windowSeconds,
  );
  if (!identifier.ok && identifier.status === 429 && ["login", "register", "password_reset"].includes(input.endpoint)) await recordDangerRisk("auth_rate_block", input.ip);
  return identifier;
}
export async function recordAuthRateLimitAttempt(
  _input: RateLimitRule & { ip: string },
) {
  return { isBlocked: false, message: "" };
}
export async function resetAuthRateLimit(input: {
  endpoint: RateLimitRule["endpoint"];
  identifier: string;
  ip: string;
}) {
  // A successful account login must not clear the shared IP abuse counter.
  await clearRateLimit(`${input.endpoint}:identifier`, input.identifier);
}

export async function verifyFormCaptcha(
  form: FormData,
  action: string,
  authFlow = false,
) {
  if (!serverEnv.hasTurnstileConfig) return { ok: true, message: "" };
  const token = readCaptchaToken(form);
  if (!token || token.length > 2048) {
    securityEvent("captcha_rejected", action, 403);
    return { ok: false, message: GENERIC_CAPTCHA_ERROR };
  }
  // Native Auth mode delegates the *single* redemption to GoTrue, never both.
  if (authFlow && process.env.AUTH_CAPTCHA_MODE === "supabase")
    return { ok: true, message: "" };
  const result = await verifyCaptchaToken(
    token,
    await getClientIp(),
    action === "oauth" ? ["login", "register"] : action,
  );
  if (!result.ok) securityEvent("captcha_rejected", action, 403);
  return result;
}
