import "server-only";
import { createHash } from "node:crypto";
import { securityRedisClient, securityRedisUrl } from "./redis-client";
import { DANGER_STATE_KEY, dangerLimit } from "./danger-policy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { securityEvent } from "./events";

export const RATE_LIMIT_MESSAGE =
  "Çox sayda sorğu göndərildi. Bir az sonra yenidən cəhd edin.";
export const STORAGE_MESSAGE =
  "Təhlükəsizlik xidməti müvəqqəti əlçatan deyil. Bir az sonra yenidən cəhd edin.";
export type LimitResult = {
  ok: boolean;
  status: 200 | 429 | 503;
  retryAfter: number;
  remaining: number;
  message: string;
};
export const RATE_SCRIPT = `local limit=tonumber(ARGV[1]); local raw=redis.call('GET',KEYS[2])
if raw then local state=cjson.decode(raw); local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
 if state.enabled==true and tonumber(state.expiresAt)>now then limit=math.min(limit,tonumber(ARGV[3])) end end
local n = tonumber(redis.call('GET', KEYS[1]) or '0')
if n >= limit then return {0, math.max(1, redis.call('PTTL', KEYS[1])), 0} end
n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
return {1, math.max(1, redis.call('PTTL', KEYS[1])), limit-n}`;
export function rateKey(scope: string, identity: string) {
  return `security:v1:${createHash("sha256").update(`${scope}\0${identity}`).digest("hex")}`;
}
export async function consumeRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<LimitResult> {
  const key = rateKey(scope, identity);
  try {
    let allowed: boolean, retry: number, remaining: number;
    const url = securityRedisUrl();
    if (url) {
      const client = await securityRedisClient();
      const values = (await client
        .withCommandOptions({ abortSignal: AbortSignal.timeout(1500) })
        .eval(RATE_SCRIPT, {
          keys: [key, DANGER_STATE_KEY],
          arguments: [String(limit), String(windowSeconds * 1000), String(dangerLimit(scope, limit))],
        })) as number[];
      allowed = values[0] === 1;
      retry = Math.ceil(values[1] / 1000);
      remaining = values[2];
    } else {
      const { data, error } = await (createSupabaseAdminClient() as any).rpc(
        "security_consume_rate",
        { p_key: key, p_limit: limit, p_window: windowSeconds },
      );
      if (error || !data || typeof data.allowed !== "boolean")
        throw Error("storage unavailable");
      allowed = data.allowed;
      retry = data.retry_after;
      remaining = data.remaining;
    }
    if (!allowed) securityEvent("rate_limit", scope, 429);
    return {
      ok: allowed,
      status: allowed ? 200 : 429,
      retryAfter: Math.max(1, Number(retry) || windowSeconds),
      remaining,
      message: allowed ? "" : RATE_LIMIT_MESSAGE,
    };
  } catch {
    // Never silently fall back to process memory (or a different store during a
    // Redis outage). Parallel instances must observe the same counter.
    securityEvent("security_storage_unavailable", scope, 503);
    return {
      ok: false,
      status: 503,
      retryAfter: 30,
      remaining: 0,
      message: STORAGE_MESSAGE,
    };
  }
}
export async function clearRateLimit(scope: string, identity: string) {
  const key = rateKey(scope, identity),
    url = securityRedisUrl();
  try {
    if (url)
      await (await securityRedisClient())
        .withCommandOptions({ abortSignal: AbortSignal.timeout(1500) })
        .del(key);
    else
      await (createSupabaseAdminClient() as any).rpc("security_reset_rate", {
        p_key: key,
      });
  } catch {
    securityEvent("security_storage_unavailable", scope, 503);
  }
}
