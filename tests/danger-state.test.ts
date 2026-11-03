import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ eval: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/security/redis-client", () => ({ securityRedisUrl: () => "redis://fixture", securityRedisClient: async () => ({ withCommandOptions: () => ({ eval: m.eval, get: m.get }) }) }));
import { changeDangerState, getDangerState } from "@/lib/security/danger-state";
beforeEach(() => { vi.stubEnv("DANGER_SIGNING_SECRET", "fixture-32-character-secret-value-only"); vi.stubEnv("TURNSTILE_SECRET_KEY", "fixture"); vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "fixture"); m.eval.mockResolvedValue(1); });
afterEach(() => vi.unstubAllEnvs());
it("does not fall back to an unprotected state when the store is corrupt", async () => { m.get.mockResolvedValue("malformed"); await expect(getDangerState()).rejects.toThrow(); });
it("rejects unsupported durations, short signing keys and stale sessions", async () => {
  await expect(changeDangerState(true, 999999, "off")).rejects.toThrow(); expect(m.eval).not.toHaveBeenCalled();
  vi.stubEnv("DANGER_SIGNING_SECRET", "short"); await expect(changeDangerState(true, 900, "off")).rejects.toThrow(); expect(m.eval).not.toHaveBeenCalled();
});
it("updates the global state with compare-and-set and a bounded expiry", async () => {
  const state = await changeDangerState(true, 900, "off"); expect(state.enabled).toBe(true); expect(state.expiresAt - state.changedAt).toBe(900000);
  expect(m.eval.mock.calls[0][1].arguments[0]).toBe("off");
  m.eval.mockResolvedValue(0); await expect(changeDangerState(false, 0, state.version)).rejects.toThrow("başqa sessiyada");
});
