import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { query } from "./query";

const mocks = vi.hoisted(() => ({ create: vi.fn(), signOut: vi.fn(), profileError: null as unknown, revokedAt: null as string | null }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));

beforeEach(() => {
  mocks.profileError = null;
  mocks.revokedAt = null;
  mocks.create.mockImplementation((_url, _key, options) => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: `a.${Buffer.from(JSON.stringify({ iat: 100 })).toString("base64url")}.b` } } }),
      signOut: mocks.signOut.mockResolvedValue({}),
      getUser: async () => {
        options.cookies.setAll([{ name: "session", value: "fresh", options: { path: "/" } }]);
        return { data: { user: { id: "seller-1" } } };
      },
    },
    from: () => query({ data: { role: "seller", session_revoked_at: mocks.revokedAt }, error: mocks.profileError }),
  }));
});

it("forwards refreshed cookies to the server rendering the localized page", async () => {
  const request = new NextRequest("https://alisveris.az/store/dashboard", {
    headers: { cookie: "session=expired" },
  });
  const headers = new Headers(request.headers);
  headers.set("x-current-path", "/store/dashboard");
  headers.set("X-NEXT-INTL-LOCALE", "az");
  const rewrite = NextResponse.rewrite(new URL("/az/store/dashboard", request.url), {
    request: { headers },
  });
  const response = await updateSession(request, rewrite);
  expect(response.headers.get("x-middleware-request-cookie")).toContain("session=fresh");
  expect(response.headers.get("x-middleware-request-x-current-path")).toBe("/store/dashboard");
  expect(response.headers.get("x-middleware-rewrite")).toContain("/az/store/dashboard");
  expect(response.cookies.get("session")?.value).toBe("fresh");
});

it("selects the isolated admin cookie on localized admin routes", async () => {
  await updateSession(new NextRequest("https://alisveris.az/az/radmin/login"));
  expect(mocks.create.mock.calls[0][2].cookieOptions?.name).toBe("sb-alisveris-admin-auth-token");
});

it("uses the same public cookie namespace after seller login", async () => {
  await updateSession(new NextRequest("https://alisveris.az/store/dashboard"));
  expect(mocks.create.mock.calls.at(-1)?.[2].cookieOptions?.name).toBe("sb-alisveris-public-auth-token-v2");
});

it("keeps login accessible when a valid auth account has an unreadable profile", async () => {
  mocks.profileError = { code: "42501", message: "permission denied" };
  const response = await updateSession(new NextRequest("https://alisveris.az/login"));
  expect(response.headers.get("location")).toBeNull();
});

it("does not route profile failures to a customer dashboard", async () => {
  mocks.profileError = { code: "42501", message: "permission denied" };
  const response = await updateSession(new NextRequest("https://alisveris.az/store/dashboard"));
  expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
});

it("keeps login accessible after the administrator revoked the old session", async () => {
  mocks.revokedAt = new Date(200_000).toISOString();
  const response = await updateSession(new NextRequest("https://alisveris.az/login"));
  expect(response.headers.get("location")).toBeNull();
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
