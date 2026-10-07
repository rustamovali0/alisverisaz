import { infiniteQueryOptions } from "@tanstack/react-query";
import type { MarketplaceProductPage, MarketplaceProductSort } from "@/lib/cart/types";

export type ProductQueryFilters = {
  locale: string;
  categoryId?: string;
  categoryIds?: string[];
  storeId?: string;
  searchQuery?: string;
  sort?: MarketplaceProductSort;
};

export function productQueryOptions(filters: ProductQueryFilters) {
  const categories = [...new Set(filters.categoryIds ?? [])].sort();
  const search = filters.searchQuery?.trim() ?? "";
  return infiniteQueryOptions({
    queryKey: ["marketplace-products", filters.locale, filters.categoryId ?? "", categories.join(","), filters.storeId ?? "", search, filters.sort ?? "newest"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<MarketplaceProductPage> => {
      const params = new URLSearchParams({ locale: filters.locale, limit: "24", sort: filters.sort ?? "newest" });
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (categories.length) params.set("categoryIds", categories.join(","));
      if (filters.storeId) params.set("storeId", filters.storeId);
      if (search) params.set("q", search);
      if (pageParam) params.set("cursor", pageParam);
      const response = await fetch(`/api/marketplace/products?${params}`, { signal });
      if (!response.ok) throw new Error("PRODUCT_PAGE_FAILED");
      return response.json();
    },
    getNextPageParam: (page) => page.hasMore ? page.nextCursor ?? undefined : undefined,
  });
}
