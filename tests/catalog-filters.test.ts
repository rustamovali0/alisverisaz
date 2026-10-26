import { expect, it } from "vitest";
import {
  filterCatalog,
  parseCatalogFilters,
  type CatalogCandidate,
} from "@/lib/catalog/filters";
import { productQueryOptions } from "@/lib/query/product-options";
const rows: CatalogCandidate[] = [
  {
    id: "new",
    created_at: "2026-10-25",
    price_amount: 100,
    discount_amount: 80,
    stock_quantity: 1,
  },
  {
    id: "vip",
    created_at: "2026-01-01",
    price_amount: 50,
    stock_quantity: 0,
    metadata: { stockTrackingEnabled: false, commerce_type: "rental" },
  },
  { id: "sold", created_at: "2026-10-26", price_amount: 10, stock_quantity: 0 },
];
it("filters by payable discounted price across the candidate set before pagination", () => {
  expect(
    filterCatalog(
      rows,
      { minPrice: "15", maxPrice: "25" },
      new Set(),
      "newest",
    ).map((x) => x.id),
  ).toEqual(["new"]);
});
it("orders VIP globally before newer products and keeps deterministic ties", () => {
  expect(
    filterCatalog(rows, {}, new Set(["vip"]), "newest").map((x) => x.id),
  ).toEqual(["vip", "sold", "new"]);
});
it("combines rental, stock tracking and VIP filters", () => {
  expect(
    filterCatalog(
      rows,
      { commerceType: "rental", inStock: true, vip: true },
      new Set(["vip"]),
      "price_asc",
    ).map((x) => x.id),
  ).toEqual(["vip"]);
});
it("price ordering uses final prices and discount filters exclude full price items", () => {
  expect(
    filterCatalog(rows, {}, new Set(), "price_asc").map((x) => x.id),
  ).toEqual(["sold", "new", "vip"]);
  expect(
    filterCatalog(rows, { discount: true }, new Set(), "newest").map(
      (x) => x.id,
    ),
  ).toEqual(["new"]);
});
it.each([
  "minPrice=-1",
  "minPrice=NaN",
  "minPrice=100&maxPrice=20",
  "maxPrice=Infinity",
])("rejects invalid shared price range %s", (query) => {
  expect(() => parseCatalogFilters(new URLSearchParams(query))).toThrow();
});
it("normalizes true/1 flags and isolates filter query caches", () => {
  expect(
    parseCatalogFilters(new URLSearchParams("vip=true&discount=1&inStock=1")),
  ).toMatchObject({ vip: true, discount: true, inStock: true });
  expect(
    productQueryOptions({ locale: "az", filters: { vip: true } }).queryKey,
  ).not.toEqual(productQueryOptions({ locale: "az" }).queryKey);
});
