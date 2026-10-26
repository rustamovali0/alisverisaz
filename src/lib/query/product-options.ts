import type { CatalogFilters } from "@/lib/catalog/filters";
import { infiniteQueryOptions } from "@tanstack/react-query";
import type {
  MarketplaceProductPage,
  MarketplaceProductSort,
} from "@/lib/cart/types";

export type ProductQueryFilters = {
  filters?: CatalogFilters;
  locale: string;
  categoryId?: string;
  categoryIds?: string[];
  storeId?: string;
  searchQuery?: string;
  sort?: MarketplaceProductSort;
  pageSize?: number;
};

export function productQueryOptions(filters: ProductQueryFilters) {
  const categories = [...new Set(filters.categoryIds ?? [])].sort();
  const search = filters.searchQuery?.trim() ?? "";
  return infiniteQueryOptions({
    queryKey: [
      "marketplace-products",
      filters.locale,
      filters.categoryId ?? "",
      categories.join(","),
      filters.storeId ?? "",
      search,
      filters.sort ?? "newest",
      filters.pageSize ?? 24,
      filters.filters ?? {},
    ],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<MarketplaceProductPage> => {
      const params = new URLSearchParams({
        locale: filters.locale,
        limit: String(filters.pageSize ?? 24),
        sort: filters.sort ?? "newest",
      });
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (categories.length) params.set("categoryIds", categories.join(","));
      if (filters.storeId) params.set("storeId", filters.storeId);
      if (search) params.set("q", search);
      for (const [key, value] of Object.entries(filters.filters ?? {})) {
        if (value !== undefined && value !== false && value !== "")
          params.set(key, String(value));
      }
      if (pageParam) params.set("cursor", pageParam);
      const response = await fetch(`/api/marketplace/products?${params}`, {
        signal,
      });
      if (!response.ok) throw new Error("PRODUCT_PAGE_FAILED");
      return response.json();
    },
    getNextPageParam: (page) =>
      page.hasMore ? (page.nextCursor ?? undefined) : undefined,
  });
}
