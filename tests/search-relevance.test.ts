import { expect, it } from "vitest";
import {
  normalizeSearchText,
  productSearchRelevance,
} from "@/lib/search/relevance";

it("folds Azerbaijani letters and recognizes laptop aliases without modifying other words", () => {
  expect(normalizeSearchText(" ƏLİ   İŞIĞI ")).toBe("eli isigi");
  expect(normalizeSearchText("NOUTBUK")).toBe(normalizeSearchText("notbuk"));
  expect(normalizeSearchText("laptoplar")).toBe("laptoplar");
});

it("ranks title matches above description-only matches", () => {
  expect(productSearchRelevance("Noutbuk", "noutbuk")).toBe(3);
  expect(productSearchRelevance("Notbuk çantası", "noutbuk")).toBe(2);
  expect(productSearchRelevance("Dell laptop", "noutbuk")).toBe(1);
  expect(productSearchRelevance("Klaviatura", "noutbuk")).toBe(0);
});
