import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { assertAuthRateLimit, getClientIp, recordAuthRateLimitAttempt } from "@/lib/auth/security";
import { query } from "./query";

const mocks = vi.hoisted(() => ({ from: vi.fn(), headers: new Headers() }));
vi.mock("next/headers", () => ({ headers: async () => mocks.headers }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ from: mocks.from }) }));
const rule = { endpoint: "password_reset" as const, identifier: "a@example.test", ip: "127.0.0.1", maxAttempts: 5, windowSeconds: 900 };
afterEach(() => { vi.unstubAllEnvs(); });

beforeEach(() => {
  mocks.from.mockReturnValue(query({ data: [] }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
it("allows a fresh rate-limit bucket", async () => {
  expect((await assertAuthRateLimit(rule)).ok).toBe(true);
});
it("fails closed when rate-limit storage cannot be read", async () => {
  mocks.from.mockReturnValue(query({ error: { code: "42P01" } }));
  expect((await assertAuthRateLimit(rule)).ok).toBe(false);
  expect((await recordAuthRateLimitAttempt(rule)).isBlocked).toBe(true);
});
it("fails closed when attempts cannot be persisted", async () => {
  mocks.from.mockReturnValueOnce(query()).mockReturnValueOnce(query({ error: { code: "42501" } }));
  expect((await recordAuthRateLimitAttempt(rule)).isBlocked).toBe(true);
});
it("records both identifier and IP buckets without raw personal data", async () => {
  const q = query();
  mocks.from.mockReturnValue(q);
  expect((await recordAuthRateLimitAttempt(rule)).isBlocked).toBe(false);
  expect(q.upsert).toHaveBeenCalledTimes(2);
  const writes = q.upsert.mock.calls.map(([value]: [unknown]) => value);
  expect(JSON.stringify(writes)).not.toContain(rule.identifier);
  expect(JSON.stringify(writes)).not.toContain(rule.ip);
});
it("blocks an exhausted bucket", async () => {
  const q = query({ data: { attempts: 4, window_start: new Date().toISOString() } });
  mocks.from.mockReturnValue(q);
  expect((await recordAuthRateLimitAttempt(rule)).isBlocked).toBe(true);
});
it("ignores forged upstream IP headers on Vercel", async () => {
  vi.stubEnv("VERCEL", "1");
  mocks.headers = new Headers({ "cf-connecting-ip": "1.2.3.4", "true-client-ip": "5.6.7.8", "x-vercel-forwarded-for": "203.0.113.10" });
  expect(await getClientIp()).toBe("203.0.113.10");
});
it("does not fall back to spoofable headers if trusted IP headers are missing", async () => {
  vi.stubEnv("VERCEL", "1");
  mocks.headers = new Headers({ "cf-connecting-ip": "1.2.3.4", "x-vercel-forwarded-for": "999.999.999.999" });
  expect(await getClientIp()).toBe("unknown");
});
