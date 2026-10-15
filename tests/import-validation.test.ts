import { describe, expect, it } from "vitest";
import { validateImportRecords } from "@/lib/products/import-validation";
describe("bounded product import validation", () => {
  it("accepts untracked stock and zero price", () => {
    expect(validateImportRecords([["sku", "name", "price", "stock"], ["abc-1", "Məhsul", "0", ""]]).rows[0]).toMatchObject({ sku: "ABC-1", stock: null, price: 0 });
  });
  it("rejects duplicate SKUs without silently changing them", () => {
    expect(validateImportRecords([["sku", "name", "price"], ["a", "A", "1"], ["A", "B", "2"]]).errors).toHaveLength(1);
  });
  it.each(["=WEBSERVICE(1)", "+SUM(1)", "@SUM(1)", "\t=1", "-1"])("rejects formula-like cells %s", (value) => {
    expect(validateImportRecords([["sku", "name", "price"], ["a", value, "1"]]).errors).toHaveLength(1);
  });
  it("rejects unbounded rows and unknown headers", () => {
    expect(() => validateImportRecords(Array.from({ length: 202 }, () => ["a"]))).toThrow();
    expect(() => validateImportRecords([["sku", "name", "price", "image_url"], ["a", "a", "1", "http://localhost"]])).toThrow();
  });
  it("rejects non-finite and overprecision prices", () => {
    expect(validateImportRecords([["sku", "name", "price"], ["a", "A", "Infinity"], ["b", "B", "1.123"]]).errors).toHaveLength(2);
  });
});
