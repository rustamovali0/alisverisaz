import "server-only";
import { defaultNavigationSeedMenus } from "@/lib/cms/navigation-defaults";
import type {
  ManagedNavigationItem,
  ManagedNavigationMenu,
} from "@/lib/cms/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { safeLinkHref } from "@/lib/security/urls";

const prefix = "cms_navigation_item:";
export function builtinNavigation(): ManagedNavigationMenu[] {
  return defaultNavigationSeedMenus.map((menu) => ({
    id: `builtin:${menu.key}`,
    key: menu.key,
    title: menu.title,
    location: menu.location,
    isActive: true,
    isSystem: true,
    items: menu.items.map((item, index) => ({
      ...item,
      id: `builtin:${menu.key}:${index}`,
      menuId: `builtin:${menu.key}`,
      sortOrder: index + 1,
      isActive: true,
      isSystem: menu.location !== "header",
      isExternal: false,
      openInNewTab: false,
      showMobile: true,
      showDesktop: true,
      requiredRole: item.requiredRole || null,
      requiredFeature: null,
      badgeText: null,
    })),
  }));
}
export async function loadFallbackNavigation() {
  const db = createSupabaseAdminClient() as any;
  const { data, error } = await db
    .from("platform_settings")
    .select("key,value")
    .like("key", prefix + "%");
  if (error) throw new Error("Menyu ayarları oxunmadı.");
  const overrides = new Map(
    (data || []).map((row: any) => [row.key, row.value]),
  );
  return builtinNavigation().map((menu) => ({
    ...menu,
    items: menu.items
      .map((item) => {
        const stored = overrides.get(prefix + item.id) as
          Partial<ManagedNavigationItem> | undefined;
        if (!stored || typeof stored !== "object") return item;
        return {
          ...item,
          title: typeof stored.title === "string" ? stored.title : item.title,
          href: item.isSystem
            ? item.href
            : safeLinkHref(stored.href, { allowContact: true }) || item.href,
          icon: typeof stored.icon === "string" ? stored.icon : item.icon,
          sortOrder:
            typeof stored.sortOrder === "number"
              ? stored.sortOrder
              : item.sortOrder,
          isActive:
            typeof stored.isActive === "boolean"
              ? stored.isActive
              : item.isActive,
          isExternal: stored.isExternal === true,
          openInNewTab: stored.openInNewTab === true,
          showMobile: stored.showMobile !== false,
          showDesktop: stored.showDesktop !== false,
          badgeText:
            typeof stored.badgeText === "string" ? stored.badgeText : null,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}
/** Called only after the server action has authenticated an administrator and validated the destination. */
export async function saveFallbackNavigationItem(
  id: string,
  patch: Partial<ManagedNavigationItem>,
) {
  if (
    !builtinNavigation().some((menu) =>
      menu.items.some((item) => item.id === id),
    )
  )
    return { message: "Menyu elementi tapılmadı." };
  const { error } = await (createSupabaseAdminClient() as any)
    .from("platform_settings")
    .upsert({ key: prefix + id, value: patch }, { onConflict: "key" });
  return error ? { message: "Menyu saxlanmadı. Yenidən cəhd edin." } : null;
}
