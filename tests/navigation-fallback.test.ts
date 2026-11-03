import { beforeEach, expect, it, vi } from "vitest";
import {
  builtinNavigation,
  loadFallbackNavigation,
  saveFallbackNavigationItem,
} from "@/lib/cms/navigation-fallback";
const m = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      expect(table).toBe("platform_settings");
      return {
        select: () => ({
          like: async () => ({
            data: [...m.store].map(([key, value]) => ({ key, value })),
            error: null,
          }),
        }),
        upsert: async (row: any) => {
          m.store.set(row.key, row.value);
          return { error: null };
        },
      };
    },
  }),
}));
beforeEach(() => m.store.clear());
it("provides real default navigation when the optional CMS menu tables are missing", async () => {
  const menus = await loadFallbackNavigation();
  expect(
    menus.find((m) => m.location === "header")?.items.map((i) => i.href),
  ).toContain("/products?commerceType=rental");
  expect(
    menus
      .find((m) => m.location === "admin_extra")
      ?.items.some((i) => i.href === "/radmin/media"),
  ).toBe(false);
});
it("persists a menu override in the existing settings store and returns it on the next read", async () => {
  const item = builtinNavigation()[0].items[1];
  expect(
    await saveFallbackNavigationItem(item.id, {
      title: "Yeni ad",
      href: "/products?discount=true",
      sortOrder: 2,
    }),
  ).toBeNull();
  const read = (await loadFallbackNavigation())[0].items.find(
    (i) => i.id === item.id,
  );
  expect(read).toMatchObject({
    title: "Yeni ad",
    href: "/products?discount=true",
  });
});
it("does not turn malicious legacy destinations into clickable links", async () => {
  const item = builtinNavigation()[0].items[0];
  m.store.set("cms_navigation_item:" + item.id, {
    href: "javascript:alert(1)",
  });
  expect((await loadFallbackNavigation())[0].items[0].href).toBe("/");
});
it("cannot create arbitrary settings keys through a forged menu identifier", async () => {
  expect(
    await saveFallbackNavigationItem("forged:id", { title: "Bad" }),
  ).toBeTruthy();
  expect(m.store.size).toBe(0);
});
