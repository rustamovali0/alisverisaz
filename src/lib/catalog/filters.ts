import type { MarketplaceProductSort } from "@/lib/cart/types";

export type CatalogFilters = {
  minPrice?: string;
  maxPrice?: string;
  color?: string;
  size?: string;
  inStock?: boolean;
  discount?: boolean;
  vip?: boolean;
  commerceType?: string;
};
export type CatalogCandidate = {
  id: string;
  created_at?: string | null;
  price_amount: number | string;
  discount_amount?: number | string | null;
  stock_quantity: number;
  metadata?: { stockTrackingEnabled?: boolean; commerce_type?: string } | null;
  product_options?: {
    type: string;
    is_enabled: boolean;
    product_option_values?: { value: string }[];
  }[];
};
export function parseCatalogFilters(params: {
  get(name: string): string | null;
}): CatalogFilters {
  const price = (name: string) => {
    const raw = params.get(name)?.trim();
    if (!raw) return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 1e12)
      throw new Error("INVALID_PRICE");
    return String(value);
  };
  const minPrice = price("minPrice"),
    maxPrice = price("maxPrice");
  if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice))
    throw new Error("INVALID_PRICE_RANGE");
  const enabled = (key: string) =>
    ["true", "1"].includes(params.get(key) ?? "");
  return {
    minPrice,
    maxPrice,
    color: params.get("color")?.slice(0, 80) || undefined,
    size: params.get("size")?.slice(0, 80) || undefined,
    inStock: enabled("inStock"),
    discount: enabled("discount"),
    vip: enabled("vip"),
    commerceType:
      params.get("commerceType") === "rental"
        ? "rental"
        : params.get("commerceType") === "sale"
          ? "sale"
          : undefined,
  };
}
export function catalogPrice(row: CatalogCandidate) {
  return Math.max(
    0,
    Number(row.price_amount) - Number(row.discount_amount ?? 0),
  );
}
export function filterCatalog(
  rows: CatalogCandidate[],
  filters: CatalogFilters,
  promoted: Set<string>,
  sort: MarketplaceProductSort,
) {
  return rows
    .filter((row) => {
      const price = catalogPrice(row);
      if (filters.minPrice && price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && price > Number(filters.maxPrice)) return false;
      if (
        filters.inStock &&
        row.metadata?.stockTrackingEnabled !== false &&
        row.stock_quantity <= 0
      )
        return false;
      if (filters.discount && Number(row.discount_amount ?? 0) <= 0)
        return false;
      if (filters.vip && !promoted.has(row.id)) return false;
      if (
        filters.commerceType &&
        (row.metadata?.commerce_type === "rental" ? "rental" : "sale") !==
          filters.commerceType
      )
        return false;
      for (const type of ["color", "size"] as const) {
        if (
          filters[type] &&
          !row.product_options?.some(
            (o) =>
              o.is_enabled &&
              o.type === type &&
              o.product_option_values?.some((v) => v.value === filters[type]),
          )
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      const vip = Number(promoted.has(b.id)) - Number(promoted.has(a.id));
      if (vip) return vip;
      const value =
        sort === "price_asc"
          ? catalogPrice(a) - catalogPrice(b)
          : sort === "price_desc"
            ? catalogPrice(b) - catalogPrice(a)
            : sort === "oldest"
              ? (a.created_at ?? "").localeCompare(b.created_at ?? "")
              : (b.created_at ?? "").localeCompare(a.created_at ?? "");
      return value || a.id.localeCompare(b.id);
    });
}
