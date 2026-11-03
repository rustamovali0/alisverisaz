import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { securityRedisClient, securityRedisUrl } from "./redis-client";
import { DANGER_STATE_KEY } from "./danger-policy";
import { securityEvent } from "./events";

export const AUTO_CONFIG_KEY = "security:danger:auto:v1:config";
export const AUTO_COOLDOWN_KEY = "security:danger:auto:v1:cooldown";
export const AUTO_LAST_KEY = "security:danger:auto:v1:last";
export type DangerAutoConfig = { enabled: boolean; version: string; changedAt: number };
export type DangerAutoStatus = DangerAutoConfig & { lastTriggeredAt: number; lastReason: string; cooldownUntil: number };
export const dangerAutoOff: DangerAutoStatus = { enabled: false, version: "off", changedAt: 0, lastTriggeredAt: 0, lastReason: "", cooldownUntil: 0 };
export function dangerConfigured() {
  return Boolean(securityRedisUrl() && (process.env.DANGER_SIGNING_SECRET?.trim().length || 0) >= 32 && process.env.TURNSTILE_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}
export async function getDangerAutoStatus(): Promise<DangerAutoStatus> {
  if (!securityRedisUrl()) return { ...dangerAutoOff };
  const client = await securityRedisClient();
  const [raw, lastRaw, cooldown] = await client.withCommandOptions({ abortSignal: AbortSignal.timeout(1500) }).mGet([AUTO_CONFIG_KEY, AUTO_LAST_KEY, AUTO_COOLDOWN_KEY]);
  const config = raw ? JSON.parse(raw) : dangerAutoOff;
  if (typeof config.enabled !== "boolean" || !/^[a-zA-Z0-9-]{1,80}$/.test(config.version) || !Number.isFinite(config.changedAt)) throw Error("Invalid automatic protection state");
  const last = lastRaw ? JSON.parse(lastRaw) : {};
  return { enabled: config.enabled, version: config.version, changedAt: config.changedAt, lastTriggeredAt: Number(last.at) || 0, lastReason: ["login_failed", "auth_rate_block"].includes(last.reason) ? last.reason : "", cooldownUntil: Number(cooldown) || 0 };
}
export const CHANGE_AUTO_SCRIPT = `local raw=redis.call('GET',KEYS[1]);local version='off'
if raw then version=cjson.decode(raw).version end
if version~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2]);redis.call('DEL',KEYS[2],KEYS[3],KEYS[4],KEYS[5]);
if cjson.decode(ARGV[2]).enabled then redis.call('DEL',KEYS[6]) end;return 1`;
export async function changeDangerAuto(enabled: boolean, version: string) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(version)) throw Error("Səhifəni yeniləyin.");
  if (enabled && !dangerConfigured()) throw Error("Təhlükəsizlik açarları sazlanmayıb.");
  const config: DangerAutoConfig = { enabled, version: randomUUID(), changedAt: Date.now() };
  const client = await securityRedisClient();
  const changed = await client.withCommandOptions({ abortSignal: AbortSignal.timeout(1500) }).eval(CHANGE_AUTO_SCRIPT, { keys: [AUTO_CONFIG_KEY, ...["login_failed", "auth_rate_block"].flatMap(k => ["security:danger:auto:v1:" + k + ":events", "security:danger:auto:v1:" + k + ":networks"]), AUTO_COOLDOWN_KEY], arguments: [version, JSON.stringify(config)] });
  if (Number(changed) !== 1) throw Error("Ayar başqa sessiyada dəyişib. Səhifəni yeniləyin.");
  return config;
}
// Fixed thresholds, bounded rolling windows, atomic activation and cooldown.
// No ordinary page views, successful logins or product/search requests enter this detector.
export const AUTO_SIGNAL_SCRIPT = `local raw=redis.call('GET',KEYS[1]);if not raw or cjson.decode(raw).enabled~=true then return {0} end
if redis.call('EXISTS',KEYS[3])==1 then return {0} end
local t=redis.call('TIME');local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
local current=redis.call('GET',KEYS[2]);if current then local s=cjson.decode(current);if s.enabled and tonumber(s.expiresAt)>now then return {0} end end
if ARGV[1]~='login_failed' and ARGV[1]~='auth_rate_block' then return {0} end
redis.call('ZREMRANGEBYSCORE',KEYS[4],'-inf',now-300000);redis.call('ZREMRANGEBYSCORE',KEYS[5],'-inf',now-300000)
redis.call('ZADD',KEYS[4],now,ARGV[3]);redis.call('ZADD',KEYS[5],now,ARGV[2]);
if redis.call('ZCARD',KEYS[4])>60 then redis.call('ZREMRANGEBYRANK',KEYS[4],0,-61) end
if redis.call('ZCARD',KEYS[5])>256 then redis.call('ZREMRANGEBYRANK',KEYS[5],0,-257) end
redis.call('EXPIRE',KEYS[4],600);redis.call('EXPIRE',KEYS[5],600)
local n=redis.call('ZCARD',KEYS[4]);local networks=redis.call('ZCARD',KEYS[5]);local needed=30;local minNetworks=5
if ARGV[1]=='auth_rate_block' then needed=60;minNetworks=3 end
if n<needed or networks<minNetworks then return {0,n,networks} end
local state=cjson.encode({enabled=true,version=ARGV[3],changedAt=now,expiresAt=now+900000})
redis.call('SET',KEYS[2],state,'EX',86400);redis.call('SET',KEYS[3],tostring(now+1800000),'EX',1800)
redis.call('SET',KEYS[6],cjson.encode({at=now,reason=ARGV[1]}),'EX',604800);return {1,n,networks,now}`;
export async function recordDangerRisk(kind: "login_failed" | "auth_rate_block", ip: string) {
  if (!dangerConfigured() || !ip || ip === "unknown") return;
  try {
    const client = await securityRedisClient();
    const version = randomUUID();
    const values = await client.withCommandOptions({ abortSignal: AbortSignal.timeout(1500) }).eval(AUTO_SIGNAL_SCRIPT, {
      keys: [AUTO_CONFIG_KEY, DANGER_STATE_KEY, AUTO_COOLDOWN_KEY, "security:danger:auto:v1:" + kind + ":events", "security:danger:auto:v1:" + kind + ":networks", AUTO_LAST_KEY],
      arguments: [kind, createHash("sha256").update("danger-auto\0" + ip).digest("hex"), version],
    }) as number[];
    if (values[0] === 1) {
      securityEvent("danger_auto_activated", kind, 200);
      const { recordAdminAudit } = await import("@/lib/admin/audit");
      await recordAdminAudit({ action: "DANGER_AUTO_ACTIVATED", metadata: { reason: kind, events: values[1], networks: values[2], version, expiresAt: values[3] + 900000 } });
    }
  } catch { securityEvent("security_storage_unavailable", "danger_auto", 503); }
}
