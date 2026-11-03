import { expect, it } from "vitest";
import {
  groupRadminNavigation,
  activeRadminItem,
} from "@/lib/dashboard/radmin-navigation";
import { dashboardNavigation } from "@/lib/dashboard/navigation";

it("keeps every admin destination exactly once, including custom CMS links", () => {
  const items = [
    ...dashboardNavigation.admin,
    { title: "Xüsusi bölmə", href: "/radmin/custom", icon: "home" as const },
  ];
  const grouped = groupRadminNavigation(items).flatMap((group) => group.items);
  expect(grouped.map((item) => item.href).sort()).toEqual(
    items
      .filter((item) => item.href !== "/radmin/panel")
      .map((item) => item.href)
      .sort(),
  );
  expect(
    groupRadminNavigation(items)
      .find((g) => g.id === "other")
      ?.items.some((item) => item.href === "/radmin/custom"),
  ).toBe(true);
});
it("finds the longest matching destination across server rewrites and visible URLs", () => {
  for (const path of ["/admin/orders/123", "/radmin/orders/123"])
    expect(activeRadminItem(dashboardNavigation.admin, path)?.href).toBe(
      "/radmin/orders",
    );
});
it("searches Azerbaijani labels and retains the result's navigation group", () => {
  const groups = groupRadminNavigation(dashboardNavigation.admin, "E-poçt");
  expect(groups).toHaveLength(1);
  expect(groups[0].items[0].href).toBe("/radmin/email");
  expect(
    groupRadminNavigation(dashboardNavigation.admin, "no-such-page"),
  ).toEqual([]);
});
