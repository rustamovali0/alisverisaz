import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ watch: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { onAuthStateChange: mocks.watch } }),
}));

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("rechecks server cookies when browser auth reports an empty session", async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    localStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
  });
  const profile = { status: "authenticated", userId: "seller", role: "seller",
    email: null, fullName: "Seller", avatarUrl: null };
  const fetcher = vi.fn(async () => Response.json({ authenticated: true, profile }));
  vi.stubGlobal("fetch", fetcher);
  const auth = await import("@/lib/auth/use-client-auth-profile");
  expect(await auth.getClientAuthProfileOnce()).toEqual(profile);
  mocks.watch.mock.calls.at(-1)![0]("SIGNED_OUT", null);
  await vi.runOnlyPendingTimersAsync();
  expect(await auth.getClientAuthProfileOnce()).toEqual(profile);
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/auth/session?scope=public&profile=1",
    expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
  );
  fetcher.mockImplementation(async () => new Response(null, { status: 401 }));
  auth.clearClientAuthProfileCache();
  expect((await auth.getClientAuthProfileOnce()).status).toBe("guest");
});
