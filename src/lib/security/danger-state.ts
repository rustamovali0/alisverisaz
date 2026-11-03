import "server-only";
import { randomUUID } from "node:crypto";
import { securityRedisClient, securityRedisUrl } from "./redis-client";
import { DANGER_STATE_KEY, dangerOff, parseDangerState, type DangerState } from "./danger-policy";

export async function getDangerState(): Promise<DangerState> {
  if (!securityRedisUrl()) return { ...dangerOff };
  const client = await securityRedisClient();
  return parseDangerState(await client.withCommandOptions({ abortSignal: AbortSignal.timeout(1500) }).get(DANGER_STATE_KEY));
}
export const CHANGE_DANGER_SCRIPT = `local current=redis.call('GET',KEYS[1]); local version='off'
if current then local state=cjson.decode(current); version=state.version end
if version~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2],'EX',86400); return 1`;
export async function changeDangerState(enabled: boolean, seconds: number, expectedVersion: string) {
  if (enabled && ![900, 3600, 21600].includes(seconds)) throw Error("Müddət düzgün deyil.");
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(expectedVersion)) throw Error("Səhifəni yeniləyin.");
  if (enabled && ((process.env.DANGER_SIGNING_SECRET?.trim().length || 0) < 32 || !process.env.TURNSTILE_SECRET_KEY?.trim() || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim())) throw Error("Təhlükəsizlik açarları sazlanmayıb.");
  const now = Date.now();
  const state: DangerState = { enabled, version: randomUUID(), changedAt: now, expiresAt: enabled ? now + seconds * 1000 : 0 };
  const client = await securityRedisClient();
  const result = await client.withCommandOptions({ abortSignal: AbortSignal.timeout(1500) }).eval(CHANGE_DANGER_SCRIPT, { keys: [DANGER_STATE_KEY], arguments: [expectedVersion, JSON.stringify(state)] });
  if (Number(result) !== 1) throw Error("Ayar başqa sessiyada dəyişib. Səhifəni yeniləyin.");
  return state;
}
