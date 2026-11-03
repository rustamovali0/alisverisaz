import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ state: vi.fn(), rate: vi.fn(), verify: vi.fn(), issue: vi.fn() }));
vi.mock("@/lib/security/danger-state", () => ({ getDangerState: m.state }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: m.rate }));
vi.mock("@/lib/auth/security", () => ({ verifyCaptchaToken: m.verify }));
vi.mock("@/lib/security/danger-proofs", () => ({ issueDangerProofs: m.issue, validateDangerBridge: () => null, issueDangerBridge: vi.fn(), dangerCookieNames: () => ({ clearance: "clearance-test", entry: "entry-test" }) }));
import { POST } from "@/app/api/security/visit/route";
function request(body = JSON.stringify({ token: "fixture-token", next: "/cart" }), extra: Record<string, string> = {}) {
  return new NextRequest("https://shop.example.test/api/security/visit", { method: "POST", headers: { host: "shop.example.test", origin: "https://shop.example.test", "content-type": "application/json", ...extra }, body });
}
beforeEach(() => { m.state.mockResolvedValue({ enabled: true, version: "mode-one", changedAt: Date.now(), expiresAt: Date.now() + 3600000 }); m.rate.mockResolvedValue({ ok: true }); m.verify.mockResolvedValue({ ok: true }); m.issue.mockReturnValue({ clearance: "signed-clearance", entry: "signed-entry" }); });
it.each(["https://evil.test", "null", ""])("rejects a foreign or absent Origin: %s", async origin => {
  expect((await POST(request(undefined, { origin }))).status).toBe(403); expect(m.verify).not.toHaveBeenCalled(); expect(m.issue).not.toHaveBeenCalled();
});
it("rejects oversized streaming and malformed bodies before provider verification", async () => {
  expect((await POST(request("x".repeat(9000)))).status).toBe(413);
  expect((await POST(request("{"))).status).toBe(400);
  expect(m.verify).not.toHaveBeenCalled();
});
it("returns Retry-After on verification abuse without contacting Cloudflare", async () => {
  m.rate.mockResolvedValue({ ok: false, status: 429, retryAfter: 45, message: "limited" });
  const r = await POST(request()); expect(r.status).toBe(429); expect(r.headers.get("retry-after")).toBe("45"); expect(m.verify).not.toHaveBeenCalled();
});
it("never issues a clearance when Siteverify rejects a reused token", async () => {
  m.verify.mockResolvedValue({ ok: false, message: "failed" }); expect((await POST(request())).status).toBe(403); expect(m.issue).not.toHaveBeenCalled();
});
it("refuses forged cross-domain intents before contacting the provider", async () => {
  const r = await POST(request(JSON.stringify({ token: "fixture", transfer: "forged" })));
  expect(r.status).toBe(403); expect(m.verify).not.toHaveBeenCalled();
});
it("issues private HttpOnly host cookies only after the expected host/action is verified", async () => {
  const r = await POST(request()); expect(r.status).toBe(200);
  expect(m.verify).toHaveBeenCalledWith("fixture-token", "unknown", "danger_visit", "shop.example.test");
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(r.headers.get("set-cookie")).toContain("HttpOnly"); expect(r.headers.get("set-cookie")).not.toContain("Domain=");
  expect((await r.json()).next).toBe("/cart");
});
it("returns a safe destination if the mode expires while the check page is open", async () => {
  m.state.mockResolvedValue({ enabled: false }); const r = await POST(request(JSON.stringify({ token: "fixture", next: "//evil.test" })));
  expect(await r.json()).toEqual({ ok: true, next: "/" }); expect(m.verify).not.toHaveBeenCalled();
});
