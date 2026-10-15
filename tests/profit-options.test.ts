import { expect, it } from "vitest";
import { isProfitTrackingEnabled, validateProfitPrices } from "@/lib/products/profit";

it("defaults profit tracking to off and accepts only explicit true", () => {
  for (const value of [null, {}, { profitTrackingEnabled: false }, { profitTrackingEnabled: "true" }]) {
    expect(isProfitTrackingEnabled(value)).toBe(false);
  }
  expect(isProfitTrackingEnabled({ profitTrackingEnabled: true })).toBe(true);
});
it("does not require cost when profit tracking is off", () => {
  expect(validateProfitPrices(new FormData(), false)).toBeNull();
});
it("requires both valid prices when enabled, including explicit zero cost", () => {
  const form = new FormData();
  form.set("priceAmount", "10");
  for (const cost of ["", " ", "-1", "NaN", "Infinity"]) {
    form.set("costAmount", cost);
    expect(validateProfitPrices(form, true)).not.toBeNull();
  }
  form.set("costAmount", "0");
  expect(validateProfitPrices(form, true)).toBeNull();
  form.delete("priceAmount");
  expect(validateProfitPrices(form, true)).not.toBeNull();
});
