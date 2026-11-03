import { expect, it } from "vitest";
import {
  promotionDuration,
  promotionEnd,
  sellerPromotionDays,
} from "@/lib/promotions/duration";
it("offers exactly the requested seller duration packages", () =>
  expect(sellerPromotionDays).toEqual([1, 3, 5, 7, 10, 30]));
it.each([
  ["days", 1, 1],
  ["days", 10, 10],
  ["months", 1, 30],
  ["months", 3, 90],
])("supports %s packages", (unit, value, days) =>
  expect(promotionDuration(unit, value)).toMatchObject({
    days,
    lifetime: false,
  }),
);
it.each([
  ["days", 0],
  ["days", 91],
  ["months", 4],
  ["days", 1.5],
  ["days", "abc"],
  ["invalid", 1],
])("rejects invalid %s durations", (unit, value) =>
  expect(promotionDuration(unit, value)).toBeNull(),
);
it("keeps existing lifetime promotions as lifetime and ends finite approvals after the requested period", () => {
  expect(promotionDuration("lifetime", "")).toMatchObject({ lifetime: true });
  expect(promotionEnd(new Date("2026-11-03T11:00:00Z"), 5)).toBe(
    "2026-11-08T11:00:00.000Z",
  );
  expect(() => promotionEnd(new Date(), 0)).toThrow();
});
