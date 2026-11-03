import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ state: vi.fn(), rate: vi.fn(), consume: vi.fn() }));
vi.mock("@/lib/security/danger-state", () => ({ getDangerState: m.state }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: m.rate }));
vi.mock("@/lib/security/redis-client", () => ({ securityRedisClient: async () => ({ withCommandOptions: () => ({ set: m.consume }) }) }));
import { POST } from "@/app/api/security/return/route";
import { issueDangerBridge } from "@/lib/security/danger-proofs";
const state = { enabled: true, version: "mode-one", expiresAt: Date.now() + 3600000, changedAt: Date.now() };
function request(proof: string, host = "vendor.example.test") { return new NextRequest("https://" + host + "/api/security/return", { method: "POST", body: JSON.stringify({ proof }), headers: { host, origin: "https://" + host, "user-agent": "browser", "content-type": "application/json" } }); }
beforeEach(() => { vi.stubEnv("DANGER_SIGNING_SECRET", "fixture-only-32-character-secret-key"); m.state.mockResolvedValue(state); m.rate.mockResolvedValue({ ok: true }); m.consume.mockResolvedValue("OK"); });
it("exchanges a completed one-use transfer for host-only cookies", async () => {
  const token = issueDangerBridge("transfer", state, { host: "vendor.example.test", userAgent: "browser", ip: "unknown" }, "/cart");
  const r = await POST(request(token)); expect(r.status).toBe(200); expect((await r.json()).next).toBe("/cart"); expect(r.headers.get("set-cookie")).toContain("HttpOnly");
  m.consume.mockResolvedValue(null); expect((await POST(request(token))).status).toBe(403);
});
it("rejects an unverified intent and a token for a different host", async () => {
  const context = { host: "vendor.example.test", userAgent: "browser", ip: "unknown" };
  expect((await POST(request(issueDangerBridge("intent", state, context, "/")))).status).toBe(403);
  expect((await POST(request(issueDangerBridge("transfer", state, context, "/"), "other.example.test"))).status).toBe(403);
  expect(m.consume).not.toHaveBeenCalled();
});
