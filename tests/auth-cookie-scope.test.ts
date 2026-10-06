import { expect, it } from "vitest";
import { getSupabaseCookieName, resolveAuthScopeFromPath } from "@/lib/supabase/auth-scope";

it("isolates public auth from legacy and administrator sessions", () => {
  expect(getSupabaseCookieName("public")).toBe("sb-alisveris-public-auth-token-v2");
  expect(getSupabaseCookieName("admin")).toBe("sb-alisveris-admin-auth-token");
  expect(getSupabaseCookieName("public")).not.toBe(getSupabaseCookieName("admin"));
});
it("uses public authentication for seller dashboard and login", () => {
  expect(resolveAuthScopeFromPath("/store/dashboard")).toBe("public");
  expect(resolveAuthScopeFromPath("/login")).toBe("public");
});
