import { afterEach, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query/client";
import { productQueryOptions } from "@/lib/query/product-options";
import type { CartProduct } from "@/lib/cart/types";

afterEach(() => vi.unstubAllGlobals());

it("keeps public query data fresh for one minute and cached for ten", () => {
  const client = createQueryClient(false);
  expect(client.getDefaultOptions().queries).toMatchObject({ staleTime: 60000, gcTime: 600000, retry: 1, refetchOnWindowFocus: false });
  client.clear();
});

it("deduplicates concurrent requests and reuses a fresh product page", async () => {
  const client = createQueryClient();
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ products: [], nextCursor: null, hasMore: false })));
  vi.stubGlobal("fetch", fetcher);
  const options = productQueryOptions({ locale: "az", storeId: "store-a" });
  await Promise.all([client.fetchInfiniteQuery(options), client.fetchInfiniteQuery(options)]);
  await client.fetchInfiniteQuery(options);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toContain("limit=24");
  expect(fetcher.mock.calls[0][0]).toContain("storeId=store-a");
  client.clear();
});

it("isolates store, locale and filter caches and normalizes category order", () => {
  const base = { locale: "az", categoryIds: ["b", "a", "a"] };
  expect(productQueryOptions(base).queryKey).toEqual(productQueryOptions({ locale: "az", categoryIds: ["a", "b"] }).queryKey);
  expect(productQueryOptions(base).queryKey).not.toEqual(productQueryOptions({ ...base, storeId: "other" }).queryKey);
  expect(productQueryOptions(base).queryKey).not.toEqual(productQueryOptions({ ...base, locale: "ru" }).queryKey);
});

it("does not refetch a fresh server-seeded product list", async () => {
  const client = createQueryClient();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const options = productQueryOptions({ locale: "az" });
  client.setQueryData(options.queryKey, { pages: [{ products: [], hasMore: false, nextCursor: null }], pageParams: [null] });
  await client.fetchInfiniteQuery(options);
  expect(fetcher).not.toHaveBeenCalled();
  client.clear();
});

it("preserves loaded data when a background refetch fails", async () => {
  const client = createQueryClient();
  const options = productQueryOptions({ locale: "az" });
  const product: CartProduct = { id: "visible", slug: "visible", storeId: "store-a", name: "Visible", description: null, priceAmount: 10, discountAmount: 0, stockQuantity: 1, imageUrl: null, depositEnabled: false, depositType: "fixed", depositValue: 0, depositAmount: 0 };
  const seed = { pages: [{ products: [product], hasMore: false, nextCursor: null }], pageParams: [null] };
  client.setQueryData(options.queryKey, seed);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
  await expect(client.fetchInfiniteQuery({ ...options, staleTime: 0, retry: false })).rejects.toThrow("PRODUCT_PAGE_FAILED");
  expect(client.getQueryData(options.queryKey)).toEqual(seed);
  client.clear();
});
