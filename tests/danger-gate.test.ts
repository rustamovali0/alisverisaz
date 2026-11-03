import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ state: vi.fn(), set: vi.fn() }));
vi.mock("@/lib/security/danger-state", () => ({ getDangerState: m.state }));
vi.mock("@/lib/security/redis-client", () => ({ securityRedisClient: async () => ({ withCommandOptions: () => ({ set: m.set }) }) }));
import { dangerGate, dangerRequestContext } from "@/lib/security/danger-gate";
import { dangerCookieNames, issueDangerProofs } from "@/lib/security/danger-proofs";
const active = { enabled: true, version: "mode-one", changedAt: Date.now(), expiresAt: Date.now() + 3600000 };
function req(path = "/products", extra: Record<string, string> = {}) { return new NextRequest("https://shop.example.test" + path, { headers: { host: "shop.example.test", "x-real-ip": "203.0.113.1", "user-agent": "browser", ...extra } }); }
beforeEach(() => { vi.stubEnv("DANGER_SIGNING_SECRET", "fixture-only-32-character-secret-key"); vi.stubEnv("TRUSTED_PROXY_MODE", "nginx"); m.state.mockResolvedValue(active); });
afterEach(() => vi.unstubAllEnvs());
it("does not change ordinary traffic while off", async () => { m.state.mockResolvedValue({ ...active, enabled: false }); expect((await dangerGate(req(), "/products")).response).toBeNull(); });
it("challenges a new page entry and prevents stale caching", async () => {
  const r = (await dangerGate(req(), "/products")).response!;
  expect(r.status).toBe(307); expect(r.headers.get("location")).toContain("/security-check?next="); expect(r.headers.get("cache-control")).toContain("no-store");
});
it("spoofed RSC/API headers without a proof do not bypass verification", async () => {
  expect((await dangerGate(req("/products", { rsc: "1" }), "/products")).response?.status).toBe(403);
  expect((await dangerGate(req("/api/marketplace/products"), "/api/marketplace/products")).response?.status).toBe(403);
});
it("allows one full entry and checks a subsequent refresh again", async () => {
  const original = req(), proofs = issueDangerProofs(active, dangerRequestContext(original), "/products");
  const names = dangerCookieNames(), cookie = `${names.clearance}=${proofs.clearance}; ${names.entry}=${proofs.entry}`;
  m.set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);
  expect((await dangerGate(req("/products", { cookie }), "/products")).response).toBeNull();
  expect((await dangerGate(req("/products", { cookie }), "/products")).response?.status).toBe(307);
  expect((await dangerGate(req("/api/marketplace/products", { cookie }), "/api/marketplace/products")).response).toBeNull();
});
it("preserves independent webhook and token-confirmation handlers", async () => {
  for (const path of ["/api/telegram/webhook", "/auth/confirm"]) expect((await dangerGate(req(path), path)).response).toBeNull();
  expect(m.state).not.toHaveBeenCalled();
});
it("fails closed when the shared security state cannot be read", async () => {
  m.state.mockRejectedValue(Error("offline"));
  const r = (await dangerGate(req(), "/products")).response!;
  expect(r.status).toBe(503); expect(r.headers.get("retry-after")).toBe("30");
});
it("routes registered custom-domain API visitors to the central checkpoint", async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://shop.example.test");
  const r = (await dangerGate(req("/api/marketplace/products"), "/api/marketplace/products", true)).response!;
  const target = new URL((await r.json()).checkUrl);
  expect(target.origin).toBe("https://shop.example.test");
  expect(target.pathname).toBe("/security-check");
  expect(target.searchParams.has("transfer")).toBe(true);
  expect(target.searchParams.has("next")).toBe(false);
});
it("never leaks the private runtime port into the public verification redirect", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const internal = new NextRequest("http://127.0.0.1:3104/products", { headers: { host: "shop.example.test", "user-agent": "browser" } });
  const location = (await dangerGate(internal, "/products")).response!.headers.get("location")!;
  expect(new URL(location).origin).toBe("https://shop.example.test");
});
