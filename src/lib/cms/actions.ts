"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { normalizeAzerbaijanPhone } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CmsActionResult } from "@/lib/cms/types";

const CMS_MEDIA_BUCKET = "cms-media";
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

function readBoolean(formData: FormData, key: string) {
  return readString(formData, key) === "on";
}

function revalidateLocalizedPath(path: string, type?: "layout" | "page") {
  revalidatePath(path, type);
  revalidatePath(`/az${path === "/" ? "" : path}`, type);
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

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  if (input.file.size > MAX_MEDIA_SIZE) {
    throw new Error(`${input.file.name} maksimum 5MB ola bilər.`);
  }

  if (!ALLOWED_MEDIA_TYPES.includes(input.file.type)) {
    throw new Error("Yalnız JPG, PNG və WebP qəbul edilir. SVG deaktivdir.");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const fileName = sanitizeFileName(input.file.name) || "image.webp";
  const path = `${input.folder}/${input.currentUserId}/${crypto.randomUUID()}-${fileName}`;
  const body = new Uint8Array(await input.file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from(CMS_MEDIA_BUCKET)
    .upload(path, body, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabaseAdmin.storage.from(CMS_MEDIA_BUCKET).getPublicUrl(path);

  const { error: insertError } = await (supabaseAdmin as any)
    .from("media_assets")
    .insert({
      bucket: CMS_MEDIA_BUCKET,
      path,
      url: data.publicUrl,
      file_name: input.file.name,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      alt_text: input.altText,
      created_by: input.currentUserId,
      updated_by: input.currentUserId,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return data.publicUrl;
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

  try {
    const logoFile = readFile(formData, "logoFile");
    const darkLogoFile = readFile(formData, "darkLogoFile");
    const faviconFile = readFile(formData, "faviconFile");

    if (logoFile) {
      logoUrl = await uploadCmsMediaFile({
        file: logoFile,
        currentUserId: current.user.id,
        folder: "site-logo",
        altText: readString(formData, "siteName") || "alisveris.az logo",
      });
    }

    if (darkLogoFile) {
      darkLogoUrl = await uploadCmsMediaFile({
        file: darkLogoFile,
        currentUserId: current.user.id,
        folder: "site-logo-dark",
        altText: `${readString(formData, "siteName") || "alisveris.az"} dark logo`,
      });
    }

    if (faviconFile) {
      faviconUrl = await uploadCmsMediaFile({
        file: faviconFile,
        currentUserId: current.user.id,
        folder: "site-favicon",
        altText: `${readString(formData, "siteName") || "alisveris.az"} favicon`,
      });
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Logo yüklənmədi.",
    };
  }

  const value = {
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
    deposit_enabled: readBoolean(formData, "depositEnabled"),
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

  revalidateLocalizedPath("/", "layout");

  return {
    ok: true,
    message: "Sayt ayarları yeniləndi.",
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
  const { error } = await (supabaseAdmin as any)
    .from("homepage_sections")
    .update({
      title: readString(formData, "title"),
      description: readString(formData, "description"),
      image_url: readString(formData, "imageUrl"),
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

  revalidateLocalizedPath("/");
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

  revalidateLocalizedPath("/");
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

  revalidateLocalizedPath("/", "layout");
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

  const { data: targetTheme } = await (supabaseAdmin as any)
    .from("theme_settings")
    .select("id,status")
    .eq("theme_key", themeKey)
    .order("status", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (!targetTheme) {
    return {
      ok: false,
      message: "Tema tapılmadı.",
    };
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

  revalidateLocalizedPath("/");
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
  const { error } = await (supabaseAdmin as any).from("theme_settings").upsert(
    {
      theme_key: themeKey,
      name: readString(formData, "name") || themeKey,
      status: "draft",
      is_active: false,
      preview_image_url: readString(formData, "previewImageUrl"),
      hero_variant: readString(formData, "heroVariant") || "default",
      product_card_variant: readString(formData, "productCardVariant") || "default",
      section_order: parseJson(readString(formData, "sectionOrder"), []),
      config: parseJson(readString(formData, "config"), {}),
      updated_by: current.user.id,
    },
    {
      onConflict: "theme_key,status",
    },
  );

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

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

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    await Promise.all(
      files.map(async (file) => {
        if (file.size > MAX_MEDIA_SIZE) {
          throw new Error(`${file.name} maksimum 5MB ola bilər.`);
        }

        if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
          throw new Error("Yalnız JPG, PNG və WebP qəbul edilir. SVG deaktivdir.");
        }

        const path = `${current.user.id}/${crypto.randomUUID()}-${file.name}`;
        const body = new Uint8Array(await file.arrayBuffer());
        const { error: uploadError } = await supabaseAdmin.storage
          .from(CMS_MEDIA_BUCKET)
          .upload(path, body, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data } = supabaseAdmin.storage
          .from(CMS_MEDIA_BUCKET)
          .getPublicUrl(path);

        const { error: insertError } = await (supabaseAdmin as any)
          .from("media_assets")
          .insert({
            bucket: CMS_MEDIA_BUCKET,
            path,
            url: data.publicUrl,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            alt_text: altText,
            created_by: current.user.id,
            updated_by: current.user.id,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }
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
    .select("bucket,path")
    .eq("id", mediaId)
    .maybeSingle();

  if (!asset) {
    return {
      ok: false,
      message: "Media tapılmadı.",
    };
  }

  await supabaseAdmin.storage.from(asset.bucket).remove([asset.path]);
  const { error } = await (supabaseAdmin as any)
    .from("media_assets")
    .delete()
    .eq("id", mediaId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
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

  if (!title) {
    return {
      ok: false,
      message: "Başlıq mütləqdir.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await (supabase as any).from("announcements").insert({
    title,
    body: readString(formData, "body"),
    type: readString(formData, "type") || "info",
    target: readString(formData, "target") || "all",
    starts_at: readString(formData, "startsAt") || null,
    ends_at: readString(formData, "endsAt") || null,
    is_dismissible: readBoolean(formData, "isDismissible"),
    is_active: readBoolean(formData, "isActive"),
    created_by: current.user.id,
    updated_by: current.user.id,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/radmin/announcements");

  return {
    ok: true,
    message: "Announcement yaradıldı.",
  };
}
