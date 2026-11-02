import { afterEach, expect, it, vi } from "vitest";
import { verifyCaptchaToken, verifyFormCaptcha } from "@/lib/auth/security";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/config/env.server", () => ({
  serverEnv: { hasTurnstileConfig: true, turnstileSecretKey: "test-only" },
}));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("rejects a missing token before calling the verifier", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect((await verifyFormCaptcha(new FormData(), "register")).ok).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  { success: false },
  { success: true, hostname: "evil.test", action: "login" },
  { success: true, hostname: "shop.example.test", action: "register" },
])("rejects failed, foreign-host and wrong-action tokens", async (data) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(data)),
  );
  expect((await verifyCaptchaToken("token", "unknown", "login")).ok).toBe(
    false,
  );
});
it("accepts the provider-verified host/action, rejects reuse and provider outages", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        success: true,
        hostname: "shop.example.test",
        action: "login",
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
    )
    .mockRejectedValueOnce(Error("network"));
  vi.stubGlobal("fetch", fetch);
  expect((await verifyCaptchaToken("token", "unknown")).ok).toBe(true);
  expect((await verifyCaptchaToken("token", "unknown")).ok).toBe(false);
  expect((await verifyCaptchaToken("token", "unknown")).ok).toBe(false);
});
it("delegates Auth mode to GoTrue exactly once but never skips missing-token checks", async () => {
  vi.stubEnv("AUTH_CAPTCHA_MODE", "supabase");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const f = new FormData();
  f.set("captchaToken", "fresh-token");
  expect((await verifyFormCaptcha(f, "login", true)).ok).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
  expect((await verifyFormCaptcha(new FormData(), "login", true)).ok).toBe(
    false,
  );
});
