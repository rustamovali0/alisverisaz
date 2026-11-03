import { expect, it } from "vitest";
import type { CartProduct } from "@/lib/cart/types";
import { getHomepageProductSections } from "@/lib/home/product-sections";

function product(
  id: string,
  overrides: Partial<CartProduct> = {},
): CartProduct {
  return {
    id,
    slug: id,
    name: id,
    storeId: "store-a",
    categoryId: "category-a",
    description: null,
    priceAmount: 100,
    discountAmount: 0,
    stockQuantity: 1,
    imageUrl: null,
    depositEnabled: false,
    depositType: "fixed",
    depositValue: 0,
    depositAmount: 0,
    ...overrides,
  };
}

it("reserves specialty listings once, skips depleted stock and keeps untracked inventory", () => {
  const vipRental = product("vip", {
    isPromoted: true,
    commerceType: "rental",
  });
  const sections = getHomepageProductSections([
    vipRental,
    vipRental,
    product("rental", { commerceType: "rental" }),
    product("discount", { discountAmount: 15 }),
    product("empty", { stockQuantity: 0 }),
    product("untracked", { stockQuantity: 0, stockTrackingEnabled: false }),
  ]);
  expect(sections.vip).toEqual([vipRental]);
  expect(sections.rentals.map(({ id }) => id)).toEqual(["rental"]);
  const { categorySections, ...productSections } = sections;
  expect(categorySections).toEqual([]);
  expect(
    Object.values(productSections)
      .flat()
      .map(({ id }) => id)
      .sort(),
  ).toEqual(["discount", "rental", "untracked", "vip"]);
});

it("prefers different stores and categories before repeating the same seller", () => {
  const items = [
    product("first"),
    product("second"),
    product("third"),
    product("fourth"),
    product("other-store", { storeId: "store-b", categoryId: "category-b" }),
  ];
  const result = getHomepageProductSections(items);
  expect(result.featured.map(({ id }) => id)).toEqual([
    "first",
    "other-store",
    "second",
  ]);
  expect(getHomepageProductSections(items)).toEqual(result);
});
