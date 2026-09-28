import { describe, expect, it, vi } from "vitest";
import { normalizeNextPath } from "@/lib/auth/safe-redirect";
import { GET as confirm } from "@/app/auth/confirm/route";
import { GET as callback } from "@/app/auth/callback/route";

vi.mock("@/lib/auth/profiles", () => ({ ensureAuthProfile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      verifyOtp: async () => ({ error: null }),
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
