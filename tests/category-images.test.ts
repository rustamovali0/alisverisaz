import { expect, it } from "vitest";
import {
  DEFAULT_CATEGORY_IMAGES,
  getCategoryImage,
} from "@/lib/categories/images";
import { existsSync } from "node:fs";
it("supplies local photos for every featured category", () => {
  expect(Object.keys(DEFAULT_CATEGORY_IMAGES)).toHaveLength(12);
  for (const image of Object.values(DEFAULT_CATEGORY_IMAGES))
    expect(existsSync(`public${image}`)).toBe(true);
});
it("uses the RAdmin-uploaded photo before the standard image", () => {
  expect(
    getCategoryImage({
      slug: "elektronika",
      imageUrl: "https://images.alisveris.az/category.webp",
    }),
  ).toBe("https://images.alisveris.az/category.webp");
  expect(getCategoryImage({ slug: "elektronika", imageUrl: null })).toBe(
    DEFAULT_CATEGORY_IMAGES.elektronika,
  );
  expect(getCategoryImage({ slug: "custom-category" })).toBeNull();
});
