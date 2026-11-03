import { expect, it } from "vitest";
import {
  readStorePolicies,
  storePolicyMaxLength,
} from "@/lib/store-settings/policies";

it("publishes only non-empty policy fields from store settings", () => {
  expect(
    readStorePolicies({
      deliveryPolicy: " Kuryerlə çatdırılır. ",
      returnPolicy: " ",
      warrantyPolicy: 12,
      privateSetting: "internal",
    }),
  ).toEqual({ deliveryPolicy: "Kuryerlə çatdırılır." });
  expect(readStorePolicies()).toEqual({});
  expect(
    readStorePolicies({ returnPolicy: "a".repeat(2000) }).returnPolicy,
  ).toHaveLength(storePolicyMaxLength);
});
