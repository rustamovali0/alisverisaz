import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const source = readFileSync("src/lib/cms/data.ts", "utf8");

it("does not invalidate cache while an admin page seeds default navigation", () => {
  const navigationReadPath = source.slice(
    source.indexOf("export async function getNavigationMenus"),
    source.indexOf("async function applyDashboardFeatureFilters"),
  );

  expect(navigationReadPath).toContain("await ensureDefaultNavigationMenus()");
  expect(navigationReadPath).not.toContain("invalidateNavigationPublicData");
});
