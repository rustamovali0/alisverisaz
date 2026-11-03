import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  eval: vi.fn(),
  rpc: vi.fn(),
  options: vi.fn(),
  client: null as any,
}));
vi.mock("redis", () => ({ createClient: () => m.client }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ rpc: m.rpc }),
}));
import { consumeRateLimit } from "@/lib/security/rate-limit";
beforeEach(() => {
  vi.stubEnv("SECURITY_REDIS_URL", "redis://127.0.0.1:16379");
  m.client = {
    isOpen: true,
    isReady: true,
    listenerCount: () => 1,
    withCommandOptions: m.options,
  };
  m.options.mockReturnValue({ eval: m.eval });
});
afterEach(() => vi.unstubAllEnvs());
it("uses one bounded atomic Lua command for a Redis-backed budget", async () => {
  m.eval.mockResolvedValue([1, 59000, 4]);
  expect(await consumeRateLimit("login", "test", 5, 60)).toMatchObject({
    ok: true,
    remaining: 4,
    retryAfter: 59,
  });
  expect(m.options.mock.calls[0][0].abortSignal).toBeInstanceOf(AbortSignal);
  const [, options] = m.eval.mock.calls[0];
  expect(options.arguments).toEqual(["5", "60000", "5"]);
  expect(options.keys[0]).not.toContain("test");
});
it("fails closed on Redis outage without switching to a fresh PostgreSQL counter", async () => {
  m.eval.mockRejectedValue(Error("offline"));
  expect(await consumeRateLimit("login", "test", 5, 60)).toMatchObject({
    ok: false,
    status: 503,
  });
  expect(m.rpc).not.toHaveBeenCalled();
});
