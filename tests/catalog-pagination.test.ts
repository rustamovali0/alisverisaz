import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rows: [] as any[],
  promoted: new Set<string>(),
  ranges: [] as number[],
}));
vi.mock("@/lib/supabase/public", () => ({
  createSupabasePublicClient: () => ({
    from: () => {
      const query: any = {
        select: () => query,
        eq: () => query,
        or: () => query,
        order: () => query,
        range: async (start: number, end: number) => {
          state.ranges.push(start);
          return { data: state.rows.slice(start, end + 1), error: null };
        },
        in: async (_: string, ids: string[]) => ({
          data: state.rows.filter((row) => ids.includes(row.id)),
          error: null,
        }),
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/promotions/data", () => ({
  getActivePromotionMaps: async () => ({ promotedProductIds: state.promoted }),
}));
vi.mock("@/lib/cache/public-cache", () => ({
  publicCache: (fn: any) => fn,
  normalizeCacheLocale: (v: string) => v,
  CACHE_TAGS: {
    products: "products",
    categories: "categories",
    homepage: "homepage",
  },
  CACHE_TTL: { SHORT: 30 },
}));
import { getMarketplaceProductPage } from "@/lib/cart/data";
beforeEach(() => {
  state.ranges = [];
  state.promoted = new Set(["product-500"]);
  state.rows = Array.from({ length: 501 }, (_, i) => ({
    id: `product-${String(i).padStart(3, "0")}`,
    store_id: "store",
    name: `Product ${i}`,
    slug: `product-${i}`,
    created_at: "2026-10-26",
    price_amount: i,
    discount_amount: i === 450 ? 440 : 0,
    stock_quantity: 1,
    deposit_enabled: false,
    deposit_type: "fixed",
    deposit_value: 0,
    stores: { name: "Store", slug: "store", status: "active" },
  }));
});
it("reads every candidate batch and includes a VIP beyond the first database batch", async () => {
  const first = await getMarketplaceProductPage("az", { limit: 2 });
  expect(state.ranges).toEqual([0, 500]);
  expect(first.products.map((p) => p.id)).toEqual([
    "product-500",
    "product-000",
  ]);
  expect(first.hasMore).toBe(true);
  const second = await getMarketplaceProductPage("az", {
    limit: 2,
    cursor: first.nextCursor,
  });
  expect(second.products.map((p) => p.id)).toEqual([
    "product-001",
    "product-002",
  ]);
  expect(
    second.products.some((p) =>
      first.products.some((first) => first.id === p.id),
    ),
  ).toBe(false);
});
it("finds discounted prices beyond the first page before choosing result IDs", async () => {
  const page = await getMarketplaceProductPage("az", {
    limit: 24,
    filters: { minPrice: "10", maxPrice: "10", discount: true },
  });
  expect(page.products.map((p) => p.id)).toEqual(["product-450"]);
  expect(page.hasMore).toBe(false);
});
