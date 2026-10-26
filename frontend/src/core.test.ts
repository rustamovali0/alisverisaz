import { describe, it, expect } from "vitest";
import { filterProducts, defaultFilters, validRange } from "./core";
import { products, normalize, money } from "./data";
describe("Məhsul axtarışı və filtrlər", () => {
  it("Azərbaycan hərflərini axtarış üçün uyğunlaşdırır", () =>
    expect(normalize("QULAQLIQ, Gözəllik, Şüşə")).toBe(
      "qulaqliq, gozellik, suse",
    ));
  it("Məhsul və mağaza adları ilə axtarır", () => {
    expect(
      filterProducts(products, { ...defaultFilters, q: "sony" }).map(
        (p) => p.id,
      ),
    ).toEqual([1]);
    expect(
      filterProducts(products, { ...defaultFilters, q: "techzone" }),
    ).toHaveLength(2);
  });
  it("Kateqoriya, qiymət və endirim filtrlərini birgə tətbiq edir", () => {
    const result = filterProducts(products, {
      ...defaultFilters,
      category: "Elektronika",
      min: "300",
      max: "750",
      discount: true,
    });
    expect(result.map((p) => p.id)).toEqual([1, 3]);
  });
  it("Yalnız icarəyə verilən məhsulları qaytarır", () =>
    expect(
      filterProducts(products, { ...defaultFilters, rental: true }).map(
        (p) => p.id,
      ),
    ).toEqual([6]));
  it("Qiyməti artan sıra ilə göstərir", () => {
    const result = filterProducts(products, {
      ...defaultFilters,
      sort: "price-asc",
    });
    expect(result[0].price).toBe(39);
    expect(result.at(-1)?.price).toBe(799);
  });
  it("Qiymət aralığında mənfi və tərs aralığı qəbul etmir", () => {
    expect(validRange("-1", "100")).toBe(false);
    expect(validRange("200", "100")).toBe(false);
    expect(validRange("100", "200")).toBe(true);
    expect(validRange("", "")).toBe(true);
  });
  it("Nəticəsiz axtarışı düzgün qaytarır", () =>
    expect(
      filterProducts(products, { ...defaultFilters, q: "olmayan-mehsul-xyz" }),
    ).toEqual([]));
  it("Yalnız stokda olan məhsulları göstərir", () => {
    expect(
      filterProducts([{ ...products[0], stock: 0 }], {
        ...defaultFilters,
        stock: true,
      }),
    ).toHaveLength(0);
  });
  it("VIP məhsulları əvvəl göstərir", () => {
    const result = filterProducts(products, defaultFilters);
    expect(result.slice(0, 4).every((p) => p.vip)).toBe(true);
  });
  it("Qiymətləri AZN formatında göstərir", () => {
    expect(money(49.5)).toContain("₼");
    expect(money(49.5)).toMatch(/49[.,]50/);
  });
});
