import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { getClientAuthProfileOnce, useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import { query } from "./query";

vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({
  auth: {
    onAuthStateChange: vi.fn(),
    getUser: async () => ({ data: { user: { id: "seller-1", email: "qa@example.test" } } }),
  },
  from: () => query({ data: { role: "seller", full_name: "QA Seller" } }),
}) }));
afterEach(() => { vi.unstubAllGlobals(); });
it("starts late-hydrating consumers with the server snapshot even after auth cache is filled", async () => {
  function Consumer() {
    const { profile, isResolved } = useClientAuthProfileState();
    return createElement("span", null, `${profile.status}:${isResolved}`);
  }
  const initial = renderToString(createElement(Consumer));
  vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: vi.fn() } });
  expect((await getClientAuthProfileOnce()).status).toBe("authenticated");
  expect(renderToString(createElement(Consumer))).toBe(initial);
});
