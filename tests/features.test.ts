import { beforeEach, expect, it, vi } from "vitest";
import { getSellerFeatureAccess } from "@/lib/cms/data";
import { query } from "./query";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ from: mocks.from }) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
beforeEach(() => { mocks.from.mockReset(); });
it("does not bypass a disabled global feature", async () => {
  mocks.from.mockReturnValueOnce(query({ data: [{ id: "store-1" }] })).mockReturnValueOnce(query({ data: { features: { products: false } } }));
  expect(await getSellerFeatureAccess("seller-1", "products")).toBe(false);
});
it.each(["42P01", "PGRST205", "42501", "57014"])("fails closed on a feature lookup error (%s)", async (code) => {
  mocks.from.mockReturnValue(query({ error: { code } }));
  expect(await getSellerFeatureAccess("seller-1", "products")).toBe(false);
});
it("allows a successfully read enabled feature", async () => {
  mocks.from.mockReturnValueOnce(query({ data: [{ id: "store-1" }] }))
    .mockReturnValueOnce(query({ data: { features: { products: true } } }))
    .mockReturnValueOnce(query({ data: [] })).mockReturnValueOnce(query({ data: [] }));
  expect(await getSellerFeatureAccess("seller-1", "products")).toBe(true);
});
