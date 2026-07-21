import { defaultSiteSettings, navItemKey } from "@/lib/cms/defaults";
import type {
  HomepageSection,
  ManagedNavigationItem,
  ManagedNavigationMenu,
  MediaAsset,
  PanelFeatureSettings,
  SiteSettings,
  ThemeSetting,
} from "@/lib/cms/types";
import { dashboardNavigation, type DashboardNavItem } from "@/lib/dashboard/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSiteSettings(value: any): SiteSettings {
  return {
    siteName: readString(value?.site_name, defaultSiteSettings.siteName),
    shortName: readString(value?.short_name, defaultSiteSettings.shortName),
    logoUrl: readString(value?.logo_url, defaultSiteSettings.logoUrl),
    darkLogoUrl: readString(value?.dark_logo_url, defaultSiteSettings.darkLogoUrl),
    faviconUrl: readString(value?.favicon_url, defaultSiteSettings.faviconUrl),
    defaultSeoTitle: readString(
      value?.default_seo_title,
      defaultSiteSettings.defaultSeoTitle,
    ),
    defaultMetaDescription: readString(
      value?.default_meta_description,
      defaultSiteSettings.defaultMetaDescription,
    ),
    defaultSeoKeywords: readString(
      value?.default_seo_keywords,
      defaultSiteSettings.defaultSeoKeywords,
    ),
    contactEmail: readString(value?.contact_email),
    phone: readString(value?.phone),
    whatsapp: readString(value?.whatsapp),
    address: readString(value?.address),
    socialLinks:
      value?.social_links && typeof value.social_links === "object"
        ? value.social_links
        : {},
    copyrightText: readString(value?.copyright_text, defaultSiteSettings.copyrightText),
    maintenanceMode: readBoolean(
      value?.maintenance_mode,
      defaultSiteSettings.maintenanceMode,
    ),
    userRegistrationEnabled: readBoolean(
      value?.user_registration_enabled,
      defaultSiteSettings.userRegistrationEnabled,
    ),
    storeRegistrationEnabled: readBoolean(
      value?.store_registration_enabled,
      defaultSiteSettings.storeRegistrationEnabled,
    ),
    depositEnabled: readBoolean(value?.deposit_enabled, defaultSiteSettings.depositEnabled),
    activeHomeTheme: readString(
      value?.active_home_theme,
      defaultSiteSettings.activeHomeTheme,
    ),
    defaultThemeMode:
      value?.default_theme_mode === "light" ||
      value?.default_theme_mode === "dark" ||
      value?.default_theme_mode === "system"
        ? value.default_theme_mode
        : defaultSiteSettings.defaultThemeMode,
  };
}

export async function getSiteSettings() {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();

  return normalizeSiteSettings(data?.value);
}

function readHomepageSection(row: any): HomepageSection {
  return {
    id: row.id,
    key: row.key,
    title: row.title ?? "",
    description: row.description ?? "",
    imageUrl: row.image_url ?? "",
    buttonLabel: row.button_label ?? "",
    buttonUrl: row.button_url ?? "",
    itemLimit: Number(row.item_limit ?? 0),
    dataFilter: row.data_filter ?? "manual",
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    showMobile: Boolean(row.show_mobile),
    showDesktop: Boolean(row.show_desktop),
    themeVariant: row.theme_variant ?? "default",
    status: row.status ?? "published",
  };
}

export async function getHomepageSections(includeDrafts = false) {
  const supabase = await createSupabaseServerClient();
  let query = (supabase as any)
    .from("homepage_sections")
    .select(
      "id,key,title,description,image_url,button_label,button_url,item_limit,data_filter,sort_order,is_active,show_mobile,show_desktop,theme_variant,status",
    )
    .order("sort_order", {
      ascending: true,
    });

  if (!includeDrafts) {
    query = query.eq("is_active", true).eq("status", "published");
  }

  const { data } = await query;

  return ((data ?? []) as any[]).map(readHomepageSection);
}

function readTheme(row: any): ThemeSetting {
  return {
    id: row.id,
    themeKey: row.theme_key,
    name: row.name,
    status: row.status,
    isActive: Boolean(row.is_active),
    previewImageUrl: row.preview_image_url ?? "",
    heroVariant: row.hero_variant ?? "default",
    productCardVariant: row.product_card_variant ?? "default",
    sectionOrder: Array.isArray(row.section_order) ? row.section_order : [],
    config: row.config ?? {},
  };
}

export async function getThemeSettings(includeDrafts = false) {
  const supabase = await createSupabaseServerClient();
  let query = (supabase as any)
    .from("theme_settings")
    .select(
      "id,theme_key,name,status,is_active,preview_image_url,hero_variant,product_card_variant,section_order,config",
    )
    .order("created_at", {
      ascending: true,
    });

  if (!includeDrafts) {
    query = query.eq("status", "published");
  }

  const { data } = await query;

  return ((data ?? []) as any[]).map(readTheme);
}

export async function getActiveHomeTheme() {
  const [site, themes] = await Promise.all([
    getSiteSettings(),
    getThemeSettings(false),
  ]);
  const active = themes.find((theme) => theme.isActive);

  return active?.themeKey ?? site.activeHomeTheme;
}

function readNavigationItem(row: any): ManagedNavigationItem {
  return {
    id: row.id,
    menuId: row.menu_id,
    title: row.title,
    href: row.href,
    icon: row.icon_name ?? "home",
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active),
    isSystem: Boolean(row.is_system),
    isExternal: Boolean(row.is_external),
    openInNewTab: Boolean(row.open_in_new_tab),
    showMobile: Boolean(row.show_mobile),
    showDesktop: Boolean(row.show_desktop),
    requiredRole: row.required_role ?? null,
    requiredFeature: row.required_feature ?? null,
    badgeText: row.badge_text ?? null,
  };
}

export async function getNavigationMenus() {
  const supabase = await createSupabaseServerClient();
  const { data: menus } = await (supabase as any)
    .from("navigation_menus")
    .select("id,key,title,location,is_active,is_system")
    .order("created_at", {
      ascending: true,
    });
  const { data: items } = await (supabase as any)
    .from("navigation_items")
    .select(
      "id,menu_id,title,href,icon_name,sort_order,is_active,is_system,is_external,open_in_new_tab,show_mobile,show_desktop,required_role,required_feature,badge_text",
    )
    .order("sort_order", {
      ascending: true,
    });

  return ((menus ?? []) as any[]).map(
    (menu): ManagedNavigationMenu => ({
      id: menu.id,
      key: menu.key,
      title: menu.title,
      location: menu.location,
      isActive: Boolean(menu.is_active),
      isSystem: Boolean(menu.is_system),
      items: ((items ?? []) as any[])
        .filter((item) => item.menu_id === menu.id)
        .map(readNavigationItem),
    }),
  );
}

export async function getDashboardNavigationForRole(role: "seller" | "customer" | "admin") {
  const fallback = dashboardNavigation[role];
  const location =
    role === "seller"
      ? "seller_sidebar"
      : role === "customer"
        ? "customer_sidebar"
        : "admin_extra";
  const menus = await getNavigationMenus();
  const menu = menus.find((item) => item.location === location && item.isActive);

  if (!menu || menu.items.length === 0) {
    return fallback;
  }

  const overrides = new Map(menu.items.map((item) => [item.href, item]));
  const merged = fallback
    .map((item) => {
      const override = overrides.get(item.href);

      if (!override) {
        return item;
      }

      if (!override.isActive) {
        return null;
      }

      return {
        ...item,
        title: override.title,
        icon: override.icon as DashboardNavItem["icon"],
      };
    })
    .filter(Boolean) as DashboardNavItem[];

  const extra = menu.items
    .filter((item) => !fallback.some((base) => base.href === item.href) && item.isActive)
    .map(
      (item): DashboardNavItem => ({
        title: item.title,
        href: item.href,
        icon: item.icon as DashboardNavItem["icon"],
      }),
    );

  return [...merged, ...extra];
}

export async function getMediaAssets() {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("media_assets")
    .select("id,url,path,file_name,mime_type,size_bytes,alt_text,usage_count,created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  return ((data ?? []) as any[]).map(
    (row): MediaAsset => ({
      id: row.id,
      url: row.url,
      path: row.path,
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes ?? 0),
      altText: row.alt_text ?? "",
      usageCount: Number(row.usage_count ?? 0),
      createdAt: row.created_at,
    }),
  );
}

export async function getPanelSettings(kind: "store" | "user") {
  const supabase = await createSupabaseServerClient();
  const query =
    kind === "store"
      ? (supabase as any)
          .from("store_panel_settings")
          .select("*")
          .is("store_id", null)
      : (supabase as any)
          .from("user_panel_settings")
          .select("*")
          .eq("key", "global");
  const { data } = await query.limit(1).maybeSingle();

  return {
    title: data?.title ?? (kind === "store" ? "Mağaza paneli" : "Fərdi panel"),
    features: data?.features ?? {},
    sidebarItems: data?.sidebar_items ?? [],
    settings: data?.settings ?? {},
  } satisfies PanelFeatureSettings;
}

export async function getAdminStoreDetail(storeId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { count: productCount }, { data: settings }] =
    await Promise.all([
      (supabase as any)
        .from("stores")
        .select("id,name,slug,status,description,owner_id,settings,profiles(email,full_name)")
        .eq("id", storeId)
        .maybeSingle(),
      (supabase as any)
        .from("products")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("store_id", storeId),
      (supabase as any)
        .from("store_panel_settings")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle(),
    ]);

  return {
    store,
    productCount: productCount ?? 0,
    settings,
  };
}

export async function getSellerFeatureAccess(userId: string, featureKey: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: stores }, { data: globalSettings }] = await Promise.all([
    (supabase as any).from("stores").select("id").eq("owner_id", userId),
    (supabase as any)
      .from("store_panel_settings")
      .select("features")
      .is("store_id", null)
      .limit(1)
      .maybeSingle(),
  ]);
  const storeIds = ((stores ?? []) as Array<{ id: string }>).map((store) => store.id);
  const globalValue = (globalSettings?.features ?? {})[featureKey];

  if (globalValue === false) {
    return false;
  }

  if (storeIds.length === 0) {
    return globalValue !== false;
  }

  const [{ data: panelRows }, { data: overrides }] = await Promise.all([
    (supabase as any)
      .from("store_panel_settings")
      .select("store_id,features")
      .in("store_id", storeIds),
    (supabase as any)
      .from("store_feature_overrides")
      .select("store_id,is_enabled")
      .eq("feature_key", featureKey)
      .in("store_id", storeIds),
  ]);

  const overrideMap = new Map(
    ((overrides ?? []) as Array<{ store_id: string; is_enabled: boolean }>).map(
      (override) => [override.store_id, override.is_enabled],
    ),
  );
  const panelMap = new Map(
    ((panelRows ?? []) as Array<{ store_id: string; features: Record<string, boolean> }>).map(
      (row) => [row.store_id, row.features],
    ),
  );

  return storeIds.some((storeId) => {
    const override = overrideMap.get(storeId);

    if (typeof override === "boolean") {
      return override;
    }

    const storeValue = panelMap.get(storeId)?.[featureKey];

    return storeValue !== false;
  });
}

export { navItemKey };
