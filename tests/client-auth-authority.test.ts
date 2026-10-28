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
    expect.objectContaining({ credentials: "same-origin", cache: "no-cache" }),
  );
  fetcher.mockImplementation(async () => new Response(null, { status: 401 }));
  auth.clearClientAuthProfileCache();
  expect((await auth.getClientAuthProfileOnce()).status).toBe("guest");
});

it("shares the initial cookie check instead of duplicating it on INITIAL_SESSION", async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    localStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
  });
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
  vi.stubGlobal("fetch", fetcher);
  const auth = await import("@/lib/auth/use-client-auth-profile");
  const pending = auth.getClientAuthProfileOnce();
  mocks.watch.mock.calls.at(-1)![0]("INITIAL_SESSION", null);
  await vi.runOnlyPendingTimersAsync();
  expect(fetcher).toHaveBeenCalledTimes(1);
  resolve(Response.json({ authenticated: false }));
  expect((await pending).status).toBe("guest");
});

it("coalesces focus and visibility refreshes while still checking changed cookies", async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const listeners = new Map<string, () => void>();
  vi.stubGlobal("window", {
    addEventListener: (name: string, cb: () => void) => listeners.set(name, cb),
    localStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
  });
  vi.stubGlobal("document", { visibilityState: "visible", addEventListener: (name: string, cb: () => void) => listeners.set(name, cb) });
  const fetcher = vi.fn(async () => Response.json({ authenticated: false }));
  vi.stubGlobal("fetch", fetcher);
  const auth = await import("@/lib/auth/use-client-auth-profile");
  await auth.getClientAuthProfileOnce();
  listeners.get("focus")!(); listeners.get("visibilitychange")!();
  expect(fetcher).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(5_001);
  listeners.get("focus")!(); listeners.get("visibilitychange")!();
  await auth.getClientAuthProfileOnce();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("uses the verified login profile immediately and ignores a stale guest response", async () => {
  vi.resetModules();
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    localStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
  });
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
  vi.stubGlobal("fetch", fetcher);
  const auth = await import("@/lib/auth/use-client-auth-profile");
  const pending = auth.getClientAuthProfileOnce();
  const profile = { status: "authenticated", userId: "seller-1", role: "seller", email: null, fullName: "Seller", avatarUrl: null };
  expect(auth.acceptVerifiedClientAuthProfile(profile)).toBe(true);
  resolve(Response.json({ authenticated: false }));
  await pending;
  expect(await auth.getClientAuthProfileOnce()).toEqual(profile);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(auth.acceptVerifiedClientAuthProfile({ status: "authenticated", role: "root" })).toBe(false);
});

it("signals a private UI logout only after the server confirms the cookies are unauthenticated", async () => {
  vi.resetModules();
  const dispatch = vi.fn();
  vi.stubGlobal("window", {
    addEventListener: vi.fn(), dispatchEvent: dispatch,
    localStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
  });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ authenticated: false })));
  const auth = await import("@/lib/auth/use-client-auth-profile");
  await auth.getClientAuthProfileOnce();
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(dispatch.mock.calls[0][0].type).toBe(auth.VERIFIED_CLIENT_LOGOUT_EVENT);
});

it("does not signal logout for a cached guest when server verification fails", async () => {
  vi.resetModules();
  const dispatch = vi.fn();
  vi.stubGlobal("window", {
    addEventListener: vi.fn(), dispatchEvent: dispatch,
    localStorage: { getItem: () => JSON.stringify({ status: "guest", userId: null, role: null }), setItem: vi.fn(), removeItem: vi.fn() },
  });
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("Temporary network failure"); }));
  const auth = await import("@/lib/auth/use-client-auth-profile");
  expect((await auth.getClientAuthProfileOnce()).status).toBe("guest");
  expect(dispatch).not.toHaveBeenCalled();
});
