"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  invalidateHomepagePublicData,
  invalidateNavigationPublicData,
  invalidatePublicSiteSettings,
  invalidateStorePublicData,
} from "@/lib/cache/public-cache";
import { normalizeAzerbaijanPhone } from "@/lib/phone";
import {
  deleteR2MediaAssetsByUrls,
  recordImageMediaAsset,
} from "@/lib/storage/media-assets";
import { isR2PublicUrl, uploadImageToR2 } from "@/lib/storage/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultThemeSettings } from "@/lib/cms/defaults";
import type { CmsActionResult } from "@/lib/cms/types";
import {
  defaultDesignSettings,
  designPresetOptions,
  normalizeDesignSettings,
  type DesignPresetKey,
} from "@/lib/design/presets";

const MAX_MEDIA_SIZE = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));

  return Number.isFinite(value) ? value : 0;
}

function readOptionalLimit(formData: FormData, key: string) {
  const rawValue = readString(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function readBoolean(formData: FormData, key: string) {
  return readString(formData, key) === "on";
}

function readLoaderType(formData: FormData) {
  const value = readString(formData, "globalLoaderType");

  return [
    "classic",
    "dual",
    "dots-circle",
    "moving-dots",
    "half",
    "wave",
    "pulse",
    "clock",
    "oval",
    "gradient",
  ].includes(value)
    ? value
    : "classic";
}

function readLoaderPalette(formData: FormData) {
  const value = readString(formData, "globalLoaderPalette");

  return ["primary", "cyan", "emerald", "rose", "amber", "violet"].includes(value)
    ? value
    : "primary";
}

function readMobileNavbarVariant(formData: FormData) {
  const value = readString(formData, "mobileNavbarVariant");

  return [
    "classic",
    "floating",
    "pill",
    "compact",
    "outlined",
    "soft",
    "solid",
    "glass",
    "minimal",
    "rail",
  ].includes(value)
    ? value
    : "classic";
}

function readDesignSettings(formData: FormData) {
  const next = { ...defaultDesignSettings };

  for (const key of Object.keys(designPresetOptions) as DesignPresetKey[]) {
    const value = readString(formData, key);
    const allowed = new Set(designPresetOptions[key].map(([optionValue]) => optionValue));

    if (allowed.has(value as never)) {
      (next as Record<string, string>)[key] = value;
    }
  }

  return next;
}

function revalidateLocalizedPath(path: string, type?: "layout" | "page") {
  revalidatePath(path, type);
}

function parseJson(value: string, fallback: unknown) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);

  return value instanceof File && value.size > 0 ? value : null;
}

function normalizeSocialLinks(formData: FormData) {
  const previous = parseJson(readString(formData, "socialLinksJson"), {});
  const links =
    previous && typeof previous === "object" && !Array.isArray(previous)
      ? { ...(previous as Record<string, unknown>) }
      : {};
  const whatsapp =
    normalizeAzerbaijanPhone(readString(formData, "socialWhatsapp")) ||
    normalizeAzerbaijanPhone(readString(formData, "whatsapp"));

  links.instagram = readString(formData, "socialInstagram");
  links.tiktok = readString(formData, "socialTiktok");
  links.whatsapp = whatsapp;

  return Object.fromEntries(
    Object.entries(links)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
      .filter(([, value]) => value),
  );
}

async function uploadCmsMediaFile(input: {
  file: File;
  currentUserId: string;
  folder: string;
  altText: string;
}) {
  const uploaded = await uploadImageToR2({
    file: input.file,
    folder: `cms/${input.folder}/${input.currentUserId}`,
    maxSizeBytes: MAX_MEDIA_SIZE,
    allowedMimeTypes: ALLOWED_MEDIA_TYPES,
  });

  await recordImageMediaAsset({
    uploaded,
    originalFileName: input.file.name,
    altText: input.altText,
    userId: input.currentUserId,
    metadata: {
      source: "cms",
      folder: input.folder,
    },
  });

  return uploaded.url;
}

async function audit(action: string, entityType: string, metadata: Record<string, unknown>) {
  const current = await requireRole(["admin"], "/radmin");
  const supabaseAdmin = createSupabaseAdminClient();

  await (supabaseAdmin as any).from("admin_audit_logs").insert({
    admin_id: current.user.id,
    action,
    entity_type: entityType,
    metadata,
  });

  return current;
}

export async function updateSiteSettingsAction(
  formData: FormData,
): Promise<CmsActionResult> {
  const current = await audit("update_site_settings", "platform_settings", {
    key: "site",
  });
  const supabaseAdmin = createSupabaseAdminClient();
  let logoUrl = readString(formData, "logoUrl");
  let darkLogoUrl = readString(formData, "darkLogoUrl");
  let faviconUrl = readString(formData, "faviconUrl");
  const replacedUrls: string[] = [];

  try {
    const logoFile = readFile(formData, "logoFile");
    const darkLogoFile = readFile(formData, "darkLogoFile");
    const faviconFile = readFile(formData, "faviconFile");

    if (logoFile) {
      replacedUrls.push(logoUrl);
      logoUrl = await uploadCmsMediaFile({
        file: logoFile,
        currentUserId: current.user.id,
        folder: "site-logo",
        altText: readString(formData, "siteName") || "Alışveriş logo",
      });
    }

    if (darkLogoFile) {
      replacedUrls.push(darkLogoUrl);
      darkLogoUrl = await uploadCmsMediaFile({
        file: darkLogoFile,
        currentUserId: current.user.id,
        folder: "site-logo-dark",
        altText: `${readString(formData, "siteName") || "Alışveriş"} dark logo`,
      });
    }

    if (faviconFile) {
      replacedUrls.push(faviconUrl);
      faviconUrl = await uploadCmsMediaFile({
        file: faviconFile,
        currentUserId: current.user.id,
        folder: "site-favicon",
        altText: `${readString(formData, "siteName") || "Alışveriş"} favicon`,
      });
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Logo yüklənmədi.",
    };
  }

  const value = {
    ...((await (supabaseAdmin as any)
      .from("platform_settings")
      .select("value")
      .eq("key", "site")
      .maybeSingle()).data?.value ?? {}),
    site_name: readString(formData, "siteName"),
    short_name: readString(formData, "shortName"),
    logo_url: logoUrl,
    dark_logo_url: darkLogoUrl,
    favicon_url: faviconUrl,
    default_seo_title: readString(formData, "defaultSeoTitle"),
    default_meta_description: readString(formData, "defaultMetaDescription"),
    default_seo_keywords: readString(formData, "defaultSeoKeywords"),
    contact_email: readString(formData, "contactEmail"),
    phone: normalizeAzerbaijanPhone(readString(formData, "phone")),
    whatsapp: normalizeAzerbaijanPhone(readString(formData, "whatsapp")),
    address: readString(formData, "address"),
    social_links: normalizeSocialLinks(formData),
    copyright_text: readString(formData, "copyrightText"),
    maintenance_mode: readBoolean(formData, "maintenanceMode"),
    user_registration_enabled: readBoolean(formData, "userRegistrationEnabled"),
    store_registration_enabled: readBoolean(formData, "storeRegistrationEnabled"),
    deposit_enabled: false,
    show_subscription_in_seller_panel: readBoolean(
      formData,
      "showSubscriptionInSellerPanel",
    ),
    subscriptions_disabled_for_sellers: !readBoolean(
      formData,
      "showSubscriptionInSellerPanel",
    ),
    global_loader: {
      type: readLoaderType(formData),
      palette: readLoaderPalette(formData),
    },
    mobile_navbar_variant: readMobileNavbarVariant(formData),
    subscription_limits: {
      default_product_limit: readOptionalLimit(formData, "defaultProductLimit"),
      default_images_per_product_limit: readOptionalLimit(
        formData,
        "defaultImagesPerProductLimit",
      ),
    },
    active_home_theme: readString(formData, "activeHomeTheme") || "default",
    default_theme_mode: readString(formData, "defaultThemeMode") || "system",
  };

  const { error } = await (supabaseAdmin as any).from("platform_settings").upsert({
    key: "site",
    value,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await deleteR2MediaAssetsByUrls(replacedUrls);
  invalidatePublicSiteSettings();
  revalidateLocalizedPath("/radmin/settings");

  return {
    ok: true,
    message: "Sayt ayarları yeniləndi.",
  };
}

export async function updateDesignSettingsAction(
  formData: FormData,
): Promise<CmsActionResult> {
  await audit("update_design_settings", "platform_settings", {
    key: "site",
    intent: readString(formData, "intent") || "publish",
  });
  const supabaseAdmin = createSupabaseAdminClient();
  const intent = readString(formData, "intent") || "publish";
  const { data: siteSettingsRow } = await (supabaseAdmin as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  const currentValue =
    siteSettingsRow?.value &&
    typeof siteSettingsRow.value === "object" &&
    !Array.isArray(siteSettingsRow.value)
      ? siteSettingsRow.value
      : {};
  const currentDesign = normalizeDesignSettings(currentValue.design);
  const nextDesign =
    intent === "reset" ? defaultDesignSettings : readDesignSettings(formData);
  const value =
    intent === "draft"
      ? {
          ...currentValue,
          design: currentDesign,
          design_draft: nextDesign,
        }
      : {
          ...currentValue,
          design: nextDesign,
          design_draft: nextDesign,
        };

  const { error } = await (supabaseAdmin as any).from("platform_settings").upsert({
    key: "site",
    value,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  invalidatePublicSiteSettings();
  revalidateLocalizedPath("/radmin/themes");

  return {
    ok: true,
    message:
      intent === "draft"
        ? "Dizayn draft saxlanıldı."
        : intent === "reset"
          ? "Dizayn default vəziyyətə qaytarıldı."
          : "Dizayn publish edildi.",
  };
}

export async function updateHomepageSectionAction(
  formData: FormData,
): Promise<CmsActionResult> {
  const current = await audit("update_homepage_section", "homepage_sections", {
    id: readString(formData, "sectionId"),
  });
  const sectionId = readString(formData, "sectionId");

  if (!sectionId) {
    return {
      ok: false,
      message: "Bölmə ID tapılmadı.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  let imageUrl = readString(formData, "imageUrl");
  const previousImageUrl = imageUrl;
  const previousSettings = parseJson(readString(formData, "settingsJson"), {});
  const settings =
    previousSettings && typeof previousSettings === "object" && !Array.isArray(previousSettings)
      ? { ...(previousSettings as Record<string, unknown>) }
      : {};

  settings.showTitle = readBoolean(formData, "showTitle");
  settings.showDescription = readBoolean(formData, "showDescription");

  try {
    const imageFile = readFile(formData, "imageFile");

    if (imageFile) {
      imageUrl = await uploadCmsMediaFile({
        file: imageFile,
        currentUserId: current.user.id,
        folder: "homepage-sections",
        altText: readString(formData, "title") || "Ana səhifə bölməsi",
      });
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Bölmə şəkli yüklənmədi.",
    };
  }

  const { error } = await (supabaseAdmin as any)
    .from("homepage_sections")
    .update({
      title: readString(formData, "title"),
      description: readString(formData, "description"),
      image_url: imageUrl,
      settings,
      button_label: readString(formData, "buttonLabel"),
      button_url: readString(formData, "buttonUrl"),
      item_limit: Math.max(Math.trunc(readNumber(formData, "itemLimit")), 0),
      data_filter: readString(formData, "dataFilter") || "manual",
      sort_order: Math.trunc(readNumber(formData, "sortOrder")),
      is_active: readBoolean(formData, "isActive"),
      show_mobile: readBoolean(formData, "showMobile"),
      show_desktop: readBoolean(formData, "showDesktop"),
      theme_variant: readString(formData, "themeVariant") || "default",
      status: readString(formData, "status") || "published",
      updated_by: current.user.id,
    })
    .eq("id", sectionId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await deleteR2MediaAssetsByUrls([previousImageUrl !== imageUrl ? previousImageUrl : ""]);
  invalidateHomepagePublicData();
  revalidateLocalizedPath("/radmin/homepage-sections");

  return {
    ok: true,
    message: "Ana səhifə bölməsi yeniləndi.",
  };
}

export async function reorderHomepageSectionsAction(
  orderedIds: string[],
): Promise<CmsActionResult> {
  await audit("reorder_homepage_sections", "homepage_sections", {
    orderedIds,
  });
  const supabaseAdmin = createSupabaseAdminClient();

  await Promise.all(
    orderedIds.map((id, index) =>
      (supabaseAdmin as any)
        .from("homepage_sections")
        .update({
          sort_order: index + 1,
        })
        .eq("id", id),
    ),
  );

  invalidateHomepagePublicData();
  revalidateLocalizedPath("/radmin/homepage-sections");

  return {
    ok: true,
    message: "Bölmə sırası yeniləndi.",
  };
}

export async function updateNavigationItemAction(
  formData: FormData,
): Promise<CmsActionResult> {
  const current = await audit("update_navigation_item", "navigation_items", {
    id: readString(formData, "itemId"),
  });
  const itemId = readString(formData, "itemId");

  if (!itemId) {
    return {
      ok: false,
      message: "Menyu elementi tapılmadı.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existing } = await (supabaseAdmin as any)
    .from("navigation_items")
    .select("is_system,href")
    .eq("id", itemId)
    .maybeSingle();

  if (existing?.is_system && !readBoolean(formData, "isActive")) {
    return {
      ok: false,
      message: "Kritik sistem menyusunu deaktiv etmək üçün ayrıca təsdiq lazımdır.",
    };
  }

  const nextHref = existing?.is_system
    ? existing.href
    : readString(formData, "href") || existing?.href || "/";

  const { error } = await (supabaseAdmin as any)
    .from("navigation_items")
    .update({
      title: readString(formData, "title"),
      href: nextHref,
      icon_name: readString(formData, "iconName") || "home",
      sort_order: Math.trunc(readNumber(formData, "sortOrder")),
      is_active: readBoolean(formData, "isActive"),
      is_external: readBoolean(formData, "isExternal"),
      open_in_new_tab: readBoolean(formData, "openInNewTab"),
      show_mobile: readBoolean(formData, "showMobile"),
      show_desktop: readBoolean(formData, "showDesktop"),
      required_feature: readString(formData, "requiredFeature") || null,
      badge_text: readString(formData, "badgeText") || null,
      updated_by: current.user.id,
    })
    .eq("id", itemId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  invalidateNavigationPublicData();
  revalidateLocalizedPath("/radmin/menus");

  return {
    ok: true,
    message: "Menyu elementi yeniləndi.",
  };
}

export async function publishThemeAction(formData: FormData): Promise<CmsActionResult> {
  const themeKey = readString(formData, "themeKey");
  const current = await audit("publish_theme", "theme_settings", {
    themeKey,
  });

  if (!themeKey) {
    return {
      ok: false,
      message: "Tema seçilməyib.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();

  let { data: targetTheme } = await (supabaseAdmin as any)
    .from("theme_settings")
    .select("id,status")
    .eq("theme_key", themeKey)
    .order("status", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (!targetTheme) {
    const fallbackTheme = defaultThemeSettings.find(
      (theme) => theme.themeKey === themeKey,
    );

    if (!fallbackTheme) {
      return {
        ok: false,
        message: "Tema tapılmadı.",
      };
    }

    const { data: insertedTheme, error: insertError } = await (supabaseAdmin as any)
      .from("theme_settings")
      .insert({
        theme_key: fallbackTheme.themeKey,
        name: fallbackTheme.name,
        status: fallbackTheme.status,
        is_active: false,
        preview_image_url: fallbackTheme.previewImageUrl,
        hero_variant: fallbackTheme.heroVariant,
        product_card_variant: fallbackTheme.productCardVariant,
        section_order: fallbackTheme.sectionOrder,
        config: fallbackTheme.config,
      })
      .select("id,status")
      .single();

    if (insertError) {
      return {
        ok: false,
        message: insertError.message,
      };
    }

    targetTheme = insertedTheme;
  }

  await (supabaseAdmin as any)
    .from("theme_settings")
    .update({
      is_active: false,
    })
    .neq("id", targetTheme.id);

  const { error } = await (supabaseAdmin as any)
    .from("theme_settings")
    .update({
      is_active: true,
      published_at: new Date().toISOString(),
      updated_by: current.user.id,
    })
    .eq("id", targetTheme.id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  const { data: siteSettings } = await (supabaseAdmin as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();

  await (supabaseAdmin as any).from("platform_settings").upsert({
    key: "site",
    value: {
      ...(siteSettings?.value ?? {}),
      active_home_theme: themeKey,
    },
  });

  invalidateHomepagePublicData();
  revalidateLocalizedPath("/radmin/themes");

  return {
    ok: true,
    message: "Tema publish edildi.",
  };
}

export async function updateThemeDraftAction(
  formData: FormData,
): Promise<CmsActionResult> {
  const current = await audit("update_theme_draft", "theme_settings", {
    themeKey: readString(formData, "themeKey"),
  });
  const themeKey = readString(formData, "themeKey");

  if (!themeKey) {
    return {
      ok: false,
      message: "Tema seçilməyib.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const payload = {
    name: readString(formData, "name") || themeKey,
    preview_image_url: readString(formData, "previewImageUrl"),
    hero_variant: readString(formData, "heroVariant") || "default",
    product_card_variant: readString(formData, "productCardVariant") || "default",
    section_order: parseJson(readString(formData, "sectionOrder"), []),
    config: parseJson(readString(formData, "config"), {}),
    updated_by: current.user.id,
  };

  const { data: existingTheme, error: lookupError } = await (supabaseAdmin as any)
    .from("theme_settings")
    .select("id,status,is_active")
    .eq("theme_key", themeKey)
    .maybeSingle();

  if (lookupError) {
    return {
      ok: false,
      message: lookupError.message,
    };
  }

  const { error } = existingTheme
    ? await (supabaseAdmin as any)
        .from("theme_settings")
        .update(payload)
        .eq("theme_key", themeKey)
    : await (supabaseAdmin as any).from("theme_settings").insert({
        theme_key: themeKey,
        status: "draft",
        is_active: false,
        ...payload,
      });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  invalidateHomepagePublicData();
  revalidateLocalizedPath("/radmin/themes");

  return {
    ok: true,
    message: "Tema draft saxlanıldı.",
  };
}

export async function uploadMediaAction(formData: FormData): Promise<CmsActionResult> {
  const current = await audit("upload_media", "media_assets", {});
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const altText = readString(formData, "altText");

  if (files.length === 0) {
    return {
      ok: false,
      message: "Yüklənəcək fayl seçilməyib.",
    };
  }

  if (files.length > 10) {
    return {
      ok: false,
      message: "Bir dəfəyə maksimum 10 şəkil yükləmək olar.",
    };
  }

  try {
    await Promise.all(
      files.map(async (file) => {
        await uploadCmsMediaFile({
          file,
          currentUserId: current.user.id,
          folder: "media-library",
          altText,
        });
      }),
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Media yüklənmədi.",
    };
  }

  revalidateLocalizedPath("/radmin/media");

  return {
    ok: true,
    message: "Media yükləndi.",
  };
}

export async function deleteMediaAction(formData: FormData): Promise<CmsActionResult> {
  await audit("delete_media", "media_assets", {
    id: readString(formData, "mediaId"),
  });
  const mediaId = readString(formData, "mediaId");
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: asset } = await (supabaseAdmin as any)
    .from("media_assets")
    .select("id,bucket,path,url")
    .eq("id", mediaId)
    .maybeSingle();

  if (!asset) {
    return {
      ok: false,
      message: "Media tapılmadı.",
    };
  }

  if (isR2PublicUrl(asset.url)) {
    await deleteR2MediaAssetsByUrls([asset.url]);
  } else {
    const { error: deleteError } = await (supabaseAdmin as any)
      .from("media_assets")
      .delete()
      .eq("id", mediaId);

    if (deleteError) {
      return {
        ok: false,
        message: deleteError.message,
      };
    }
  }

  revalidateLocalizedPath("/radmin/media");

  return {
    ok: true,
    message: "Media silindi.",
  };
}

export async function updatePanelSettingsAction(
  formData: FormData,
): Promise<CmsActionResult> {
  const kind = readString(formData, "kind");
  const current = await audit("update_panel_settings", `${kind}_panel_settings`, {
    kind,
  });

  if (kind !== "store" && kind !== "user") {
    return {
      ok: false,
      message: "Panel tipi yanlışdır.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const payload = {
    title: readString(formData, "title"),
    features: parseJson(readString(formData, "features"), {}),
    sidebar_items: parseJson(readString(formData, "sidebarItems"), []),
    settings: parseJson(readString(formData, "settings"), {}),
    updated_by: current.user.id,
  };
  const table = kind === "store" ? "store_panel_settings" : "user_panel_settings";
  const { data: existingGlobal } =
    kind === "store"
      ? await (supabaseAdmin as any)
          .from(table)
          .select("id")
          .is("store_id", null)
          .limit(1)
          .maybeSingle()
      : { data: null };
  const { error } =
    kind === "store"
      ? existingGlobal
        ? await (supabaseAdmin as any)
            .from(table)
            .update(payload)
            .eq("id", existingGlobal.id)
        : await (supabaseAdmin as any).from(table).insert({
            store_id: null,
            ...payload,
          })
      : await (supabaseAdmin as any).from(table).upsert(
          {
            key: "global",
            ...payload,
          },
          {
            onConflict: "key",
          },
        );

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateLocalizedPath("/", "layout");
  revalidateLocalizedPath(
    kind === "store" ? "/radmin/store-panel-management" : "/radmin/user-panel-management",
  );
  revalidateLocalizedPath(kind === "store" ? "/store/dashboard" : "/dashboard", "layout");

  return {
    ok: true,
    message: "Panel ayarları yeniləndi.",
  };
}

export async function updateStoreManagementAction(
  formData: FormData,
): Promise<CmsActionResult> {
  const storeId = readString(formData, "storeId");
  const current = await audit("update_store_management", "stores", {
    storeId,
  });

  if (!storeId) {
    return {
      ok: false,
      message: "Mağaza ID tapılmadı.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existingStore } = await (supabaseAdmin as any)
    .from("stores")
    .select("id,slug")
    .eq("id", storeId)
    .maybeSingle();
  const { error: storeError } = await (supabaseAdmin as any)
    .from("stores")
    .update({
      status: readString(formData, "status") || "active",
      settings: parseJson(readString(formData, "storeSettings"), {}),
    })
    .eq("id", storeId);

  if (storeError) {
    return {
      ok: false,
      message: storeError.message,
    };
  }

  const { error } = await (supabaseAdmin as any).from("store_panel_settings").upsert(
    {
      store_id: storeId,
      title: readString(formData, "panelTitle") || "Mağaza paneli",
      features: parseJson(readString(formData, "features"), {}),
      sidebar_items: parseJson(readString(formData, "sidebarItems"), []),
      settings: parseJson(readString(formData, "panelSettings"), {}),
      updated_by: current.user.id,
    },
    {
      onConflict: "store_id",
    },
  );

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/radmin/stores");
  revalidatePath(`/radmin/stores/${storeId}`);
  invalidateStorePublicData({
    storeId,
    storeSlug: existingStore?.slug,
  });

  return {
    ok: true,
    message: "Mağaza idarəetmə ayarları yeniləndi.",
  };
}

export async function createAnnouncementAction(
  formData: FormData,
): Promise<CmsActionResult> {
  const current = await audit("create_announcement", "announcements", {});
  const title = readString(formData, "title");
  const body = readString(formData, "body");
  const type = readString(formData, "type") || "info";
  const target = readString(formData, "target") || "all";
  const isActive = readBoolean(formData, "isActive");

  if (!title) {
    return {
      ok: false,
      message: "Başlıq mütləqdir.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any)
    .from("announcements")
    .insert({
      title,
      body,
      type,
      target,
      starts_at: readString(formData, "startsAt") || null,
      ends_at: readString(formData, "endsAt") || null,
      is_dismissible: readBoolean(formData, "isDismissible"),
      is_active: isActive,
      created_by: current.user.id,
      updated_by: current.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  if (isActive && data?.id) {
    await deliverAnnouncementNotifications({
      announcementId: data.id,
      title,
      body,
      type,
      target,
    });
  }

  revalidatePath("/radmin/announcements");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: isActive
      ? "Bildiriş yaradıldı və göndərildi."
      : "Bildiriş qaralama kimi saxlanıldı.",
  };
}

async function deliverAnnouncementNotifications(input: {
  announcementId: string;
  title: string;
  body: string;
  type: string;
  target: string;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  let query = (supabaseAdmin as any).from("profiles").select("id,role");

  if (input.target === "seller" || input.target === "store") {
    query = query.eq("role", "seller");
  }

  if (input.target === "customer") {
    query = query.eq("role", "customer");
  }

  if (input.target === "admin") {
    query = query.eq("role", "admin");
  }

  const { data, error } = await query;

  if (error || !Array.isArray(data) || data.length === 0) {
    return;
  }

  const rows = data
    .filter((profile: { id?: string }) => profile.id)
    .map((profile: { id: string }) => ({
      user_id: profile.id,
      type: input.type || "info",
      title: input.title,
      body: input.body || null,
      data: {
        source: "announcement",
        announcement_id: input.announcementId,
        target: input.target || "all",
      },
    }));

  if (rows.length) {
    await (supabaseAdmin as any).from("notifications").insert(rows);
  }
}
