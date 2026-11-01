import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeNextPath } from "@/lib/auth/safe-redirect";
import { GET as confirm } from "@/app/auth/confirm/route";
import { GET as callback } from "@/app/auth/callback/route";

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }));
beforeEach(() => { verifyOtp.mockResolvedValue({ error: null }); });

vi.mock("@/lib/auth/profiles", () => ({ ensureAuthProfile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      verifyOtp,
      exchangeCodeForSession: async () => ({ data: { user: { id: "user-1" } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ returns: () => ({
      maybeSingle: async () => ({ data: { role: "customer" } }),
    }) }) }) }),
  }),
}));

const unsafe = [
  null, undefined, "", "https://evil.test", "//evil.test", "/\\evil.test",
  "/%5cevil.test", "/%2fevil.test", "/%255cevil.test", "/%252fevil.test",
  "/\t/evil.test", "/\n/evil.test", "/%09/evil.test", "/%00evil.test", "/%zz",
  "javascript:alert(1)", " /dashboard", "/%25252525252fevil.test",
];

describe("auth redirect boundary", () => {
  it.each(["http://127.0.0.1:3004", "https://[::ffff:7f00:1]:3004", "https://attacker.example"])("recovery uses the configured public origin behind a proxy (%s)", async (origin) => {
    const response = await confirm(new Request(`${origin}/auth/confirm?token_hash=test-token&type=recovery&next=%2Freset-password%3Fmode%3Drecovery`, { headers: { host: "attacker.example", "x-forwarded-host": "attacker.example" } }));
    expect(response.headers.get("location")).toBe("https://shop.example.test/reset-password?mode=recovery");
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "test-token", type: "recovery" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("expired recovery tokens return to the public recovery page", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const response = await confirm(new Request("http://127.0.0.1:3004/auth/confirm?token_hash=expired&type=recovery"));
    expect(response.headers.get("location")).toBe("https://shop.example.test/forgot-password?reset=expired");
  });
  it("missing recovery tokens return to the public recovery page", async () => {
    const response = await confirm(new Request("http://127.0.0.1:3004/auth/confirm"));
    expect(response.headers.get("location")).toBe("https://shop.example.test/forgot-password?reset=expired");
    expect(verifyOtp).not.toHaveBeenCalled();
  });
  it("OAuth also uses the configured origin behind a proxy", async () => {
    const response = await callback(new Request("http://127.0.0.1:3004/auth/callback?code=test&next=%2Fdashboard"));
    expect(response.headers.get("location")).toBe("https://shop.example.test/dashboard");
  });

  it.each(unsafe)("rejects unsafe next=%s", (value) => {
    expect(normalizeNextPath(value, "/fallback")).toBe("/fallback");
  });
  it.each(["/", "/store/dashboard/products/new", "/dashboard?tab=orders#latest", "/products?q=red%20shirt", "/products?q=https%3A%2F%2Fexample.test"])("preserves internal destination %s", (value) => {
    expect(normalizeNextPath(value, "/fallback")).toBe(value);
  });
  it.each(["/%5cevil.test", "/\\evil.test", "//evil.test"])("recovery cannot redirect a valid session off-site (%s)", async (next) => {
    const url = new URL("https://shop.example.test/auth/confirm");
    url.search = new URLSearchParams({ token_hash: "test-token", type: "recovery", next }).toString();
    const response = await confirm(new Request(url));
    expect(response.headers.get("location")).toBe("https://shop.example.test/reset-password?mode=recovery");
  });
  it("OAuth callback rejects a backslash authority after exchanging a code", async () => {
    const response = await callback(new Request("https://shop.example.test/auth/callback?code=test&next=/%5Cevil.test"));
    expect(response.headers.get("location")).toBe("https://shop.example.test/");
  });
});
