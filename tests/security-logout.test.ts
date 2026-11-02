import { expect, it, vi } from "vitest";
import { GET, POST } from "@/app/[locale]/logout/route";
const m = vi.hoisted(() => ({
  out: vi.fn().mockResolvedValue({}),
  user: vi.fn().mockResolvedValue({ data: { user: { id: "own" } } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { signOut: m.out, getUser: m.user },
  }),
}));
vi.mock("@/lib/activity/events", () => ({ trackActivityEvent: vi.fn() }));
it("GET logout never changes session state", async () => {
  expect((await GET()).status).toBe(200);
  expect(m.out).not.toHaveBeenCalled();
});
it.each([
  {},
  { origin: "https://evil.test" },
  { origin: "https://shop.example.test", "sec-fetch-site": "cross-site" },
])("blocks a cross-site or originless logout POST", async (headers) => {
  const r = await POST(
    new Request("https://shop.example.test/logout", {
      method: "POST",
      headers: headers as HeadersInit,
    }),
    { params: Promise.resolve({ locale: "az" }) },
  );
  expect(r.status).toBe(403);
  expect(m.out).not.toHaveBeenCalled();
});
it("logs out only through the same-origin POST and uses 303 to avoid reposting", async () => {
  const r = await POST(
    new Request("https://shop.example.test/logout", {
      method: "POST",
      headers: { origin: "https://shop.example.test" },
    }),
    { params: Promise.resolve({ locale: "az" }) },
  );
  expect(r.status).toBe(303);
  expect(m.out).toHaveBeenCalledTimes(1);
});
