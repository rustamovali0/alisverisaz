import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { dangerOff, dangerLimit, parseDangerState, safeDangerNext, dangerExemptPath } from "@/lib/security/danger-policy";
import { issueDangerProofs, validateDangerProof, consumeDangerEntry, issueDangerBridge, validateDangerBridge } from "@/lib/security/danger-proofs";
const m = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("@/lib/security/redis-client", () => ({ securityRedisClient: async () => ({ withCommandOptions: () => ({ set: m.set }) }) }));
const now = 1000000;
const state = { enabled: true, version: "version-one", changedAt: now, expiresAt: now + 3600000 };
const context = { host: "shop.example.test", ip: "203.0.113.1", userAgent: "test-browser" };
beforeEach(() => vi.stubEnv("DANGER_SIGNING_SECRET", "fixture-only-32-character-secret-key"));
afterEach(() => vi.unstubAllEnvs());
it("automatically expires the mode without a cron or process timer", () => {
  expect(parseDangerState(JSON.stringify(state), now).enabled).toBe(true);
  expect(parseDangerState(JSON.stringify(state), state.expiresAt).enabled).toBe(false);
  expect(parseDangerState(null, now)).toEqual(dangerOff);
  expect(() => parseDangerState('{"enabled":true}')).toThrow();
});
it("tightens sensitive scopes without raising an existing stricter limit", () => {
  expect(dangerLimit("login:identifier", 5)).toBe(3);
  expect(dangerLimit("register:identifier", 3)).toBe(1);
  expect(dangerLimit("password_reset:identifier", 3)).toBe(2);
  expect(dangerLimit("products:get", 120)).toBe(30);
  expect(dangerLimit("login:identifier", 1)).toBe(1);
});
it.each(["//evil.test", "https://evil.test", "/\\evil.test", "/security-check?next=/security-check", "/en/security-check", "/path\nvalue"])("rejects unsafe/looping return path %s", value => expect(safeDangerNext(value)).toBe("/"));
it("keeps a useful local destination but removes authentication secrets", () => {
  expect(safeDangerNext("/products?q=phone&token_hash=secret&code=secret")).toBe("/products?q=phone");
});
it("does not blanket-exempt catalog APIs, radmin or dotted product slugs", () => {
  for (const path of ["/api/marketplace/products", "/radmin/danger", "/store/shop/products/name.jpg"]) expect(dangerExemptPath(path)).toBe(false);
  for (const path of ["/auth/confirm", "/api/telegram/webhook", "/brand/email-logo.png"]) expect(dangerExemptPath(path)).toBe(true);
});
it("binds a signed proof to purpose, mode, host, network and browser", () => {
  const proof = issueDangerProofs(state, context, "/cart", now);
  expect(validateDangerProof(proof.clearance, "clearance", state, context, now)).not.toBeNull();
  for (const altered of [{ ...context, host: "evil.test" }, { ...context, ip: "203.0.113.2" }, { ...context, userAgent: "another-browser" }]) expect(validateDangerProof(proof.clearance, "clearance", state, altered, now)).toBeNull();
  expect(validateDangerProof(proof.entry, "clearance", state, context, now)).toBeNull();
  expect(validateDangerProof(proof.clearance, "clearance", { ...state, version: "new-version" }, context, now)).toBeNull();
  expect(validateDangerProof(proof.clearance + "x", "clearance", state, context, now)).toBeNull();
  expect(validateDangerProof(proof.entry, "entry", state, context, now + 90001)).toBeNull();
});
it("redeems a valid navigation ticket at most once using distributed NX", async () => {
  const proof = validateDangerProof(issueDangerProofs(state, context, "/cart", now).entry, "entry", state, context, now)!;
  m.set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);
  expect(await consumeDangerEntry(proof)).toBe(true);
  expect(await consumeDangerEntry(proof)).toBe(false);
  expect(m.set.mock.calls[0][2]).toEqual({ NX: true, EX: 120 });
});
it("a custom-domain intent cannot be redeemed as a completed verification", () => {
  const custom = { ...context, host: "vendor.example.test" };
  const intent = issueDangerBridge("intent", state, custom, "/cart", now);
  const root = { ...context, ip: "203.0.113.2" };
  expect(validateDangerBridge(intent, "intent", state, root, now)?.targetHost).toBe(custom.host);
  expect(validateDangerBridge(intent, "transfer", state, custom, now)).toBeNull();
  expect(validateDangerProof(intent, "entry", state, custom, now)).toBeNull();
  const transfer = issueDangerBridge("transfer", state, custom, "/cart", now);
  expect(validateDangerBridge(transfer, "transfer", state, custom, now)?.next).toBe("/cart");
  expect(validateDangerBridge(transfer, "transfer", state, { ...custom, host: "another.example.test" }, now)).toBeNull();
  expect(validateDangerBridge(transfer, "transfer", state, { ...custom, userAgent: "different" }, now)).toBeNull();
});
