import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { securityRedisClient } from "./redis-client";
import { safeDangerNext, type DangerState } from "./danger-policy";

type Context = { host: string; ip: string; userAgent: string };
type Proof = { kind: "clearance" | "entry" | "intent" | "transfer"; version: string; fingerprint: string; expiresAt: number; nonce: string; next?: string; targetHost?: string };
function secret() {
  const value = process.env.DANGER_SIGNING_SECRET;
  if (!value || value.length < 32) throw Error("Danger signing is not configured");
  return value;
}
function fingerprint(context: Context) {
  return createHash("sha256").update(JSON.stringify([context.host, context.ip, context.userAgent])).digest("hex");
}
function sign(proof: Proof) {
  const body = Buffer.from(JSON.stringify(proof)).toString("base64url");
  return body + "." + createHmac("sha256", secret()).update(body).digest("base64url");
}
export function dangerCookieNames() {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-" : "dev-";
  return { clearance: prefix + "alisveris-danger-clearance", entry: prefix + "alisveris-danger-entry" };
}
export function issueDangerProofs(state: DangerState, context: Context, next: string, now = Date.now()) {
  if (!state.enabled || state.expiresAt <= now) throw Error("Danger mode is inactive");
  const common = { version: state.version, fingerprint: fingerprint(context), nonce: randomUUID() };
  return {
    clearance: sign({ ...common, kind: "clearance", expiresAt: Math.min(state.expiresAt, now + 3600000) }),
    entry: sign({ ...common, kind: "entry", expiresAt: Math.min(state.expiresAt, now + 90000), next: safeDangerNext(next) }),
  };
}
export function issueDangerBridge(kind: "intent" | "transfer", state: DangerState, context: Context, next: string, now = Date.now()) {
  if (!state.enabled || !/^(?=.{1,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(context.host)) throw Error("Invalid transfer target");
  return sign({ kind, version: state.version, targetHost: context.host, next: safeDangerNext(next), fingerprint: fingerprint({ ...context, ip: "bridge" }), expiresAt: Math.min(state.expiresAt, now + (kind === "intent" ? 300000 : 90000)), nonce: randomUUID() });
}
export function validateDangerBridge(token: string | undefined, kind: "intent" | "transfer", state: DangerState, context: Context, now = Date.now()) {
  try {
    if (!token || token.length > 6000) return null;
    const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    if (typeof payload.targetHost !== "string" || !/^(?=.{1,253}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(payload.targetHost)) return null;
    if (kind === "transfer" && payload.targetHost !== context.host) return null;
    return validateDangerProof(token, kind, state, { ...context, host: payload.targetHost, ip: "bridge" }, now);
  } catch { return null; }
}
export function validateDangerProof(token: string | undefined, kind: Proof["kind"], state: DangerState, context: Context, now = Date.now()): Proof | null {
  if (!token || token.length > 6000 || !state.enabled || state.expiresAt <= now) return null;
  try {
    const [body, signature, extra] = token.split(".");
    if (extra || !body || !signature || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
    const actual = Buffer.from(signature, "base64url"), expected = createHmac("sha256", secret()).update(body).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const proof = JSON.parse(Buffer.from(body, "base64url").toString()) as Proof;
    if (proof.kind !== kind || proof.version !== state.version || proof.fingerprint !== fingerprint(context) || !Number.isFinite(proof.expiresAt) || proof.expiresAt <= now || proof.expiresAt > state.expiresAt || !/^[a-f0-9-]{36}$/.test(proof.nonce)) return null;
    return proof;
  } catch { return null; }
}
export async function consumeDangerEntry(proof: Proof) {
  const client = await securityRedisClient();
  return await client.withCommandOptions({ abortSignal: AbortSignal.timeout(1500) }).set("security:danger:entry:" + proof.nonce, "1", { NX: true, EX: 120 }) === "OK";
}
