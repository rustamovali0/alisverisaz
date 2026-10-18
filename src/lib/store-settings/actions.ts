"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { invalidateStorePublicData } from "@/lib/cache/public-cache";
import {
  isReservedStoreSubdomain,
  isValidCustomDomain,
  isValidStoreSlug,
  normalizeHostname,
} from "@/lib/config/domains";
import {
  deleteR2MediaAssetsByUrls,
  recordImageMediaAsset,
} from "@/lib/storage/media-assets";
import { uploadImageToR2 } from "@/lib/storage/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_MEDIA_SIZE = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = ["image/*"];

type StoreSettingsResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);

  return value instanceof File && value.size > 0 ? value : null;
}

function readSettings(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function readBooleanSetting(settings: Record<string, unknown>, key: string) {
  return settings[key] === true;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("az-AZ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uploadStoreMedia(input: {
  file: File;
  userId: string;
  storeId: string;
  kind: "logo" | "banner" | "storefront-hero";
}) {
  const uploaded = await uploadImageToR2({
    file: input.file,
    folder: `stores/${input.storeId}/${input.kind}`,
    maxSizeBytes: MAX_MEDIA_SIZE,
    allowedMimeTypes: ALLOWED_MEDIA_TYPES,
  });

  await recordImageMediaAsset({
    uploaded,
    originalFileName: input.file.name,
    altText:
      input.kind === "logo"
        ? "Mağaza logosu"
        : input.kind === "storefront-hero"
          ? "Şəxsi mağaza vitrin şəkli"
          : "Mağaza banneri",
    userId: input.userId,
    metadata: {
      source: "store-settings",
      storeId: input.storeId,
      kind: input.kind,
    },
  });

  return uploaded.url;
}

export async function updateSellerStoreSettingsAction(
  formData: FormData,
): Promise<StoreSettingsResult> {
  const current = await requireRole(["seller"], "/store/dashboard/settings");
  const storeId = readString(formData, "storeId");
  const name = readString(formData, "name");
  const requestedSlug = slugify(readString(formData, "slug"));
  const heroTitle = readString(formData, "heroTitle");
  const heroSubtitle = readString(formData, "heroSubtitle");
  const customDomain = normalizeHostname(readString(formData, "customDomain"));
  const aboutContent = readString(formData, "aboutContent");
  const socialInstagram = readString(formData, "socialInstagram");
  const socialTiktok = readString(formData, "socialTiktok");
  const logoFile = readFile(formData, "logo");
  const bannerFile = readFile(formData, "banner");
  const storefrontHeroFile = readFile(formData, "storefrontHero");
  const featuredCategoryIds = formData
    .getAll("featuredCategoryIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const bannerPosition: Record<string, number> = {};
  for (const key of ["bannerPositionX", "bannerPositionY"]) {
    if (!formData.has(key)) continue;
    const value = Number(readString(formData, key));
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return { ok: false, message: "Banner mövqeyi 0–100 arasında olmalıdır." };
    }
    bannerPosition[key] = value;
  }

  if (!storeId || !name) {
    return {
      ok: false,
      message: "Mağaza adı mütləqdir.",
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: store } = await (supabaseAdmin as any)
    .from("stores")
    .select("id,owner_id,slug,logo_url,cover_url,settings")
    .eq("id", storeId)
    .eq("owner_id", current.user.id)
    .maybeSingle();

  if (!store) {
    return {
      ok: false,
      message: "Mağaza tapılmadı.",
    };
  }

  const replacedUrls: string[] = [];
  const nextSlug = requestedSlug || store.slug;
  const currentSettings = readSettings(store.settings);
  const canManageCustomStorefront = readBooleanSetting(
    currentSettings,
    "customStorefrontEnabled",
  );

  if (!isValidStoreSlug(nextSlug) || isReservedStoreSubdomain(nextSlug)) {
    return {
      ok: false,
      message: "Mağaza URL-i yalnız hərf, rəqəm və tire ola bilər; bu ad rezerv olunub.",
    };
  }

  if (nextSlug !== store.slug) {
    if (!canManageCustomStorefront) {
      return {
        ok: false,
        message: "Subdomain və /mağaza-adı dəyişmək üçün RAdmin icazəsi lazımdır.",
      };
    }

    const { data: slugOwner } = await (supabaseAdmin as any)
      .from("stores")
      .select("id")
      .eq("slug", nextSlug)
      .neq("id", storeId)
      .maybeSingle();

    if (slugOwner) {
      return {
        ok: false,
        message: "Bu mağaza URL-i artıq istifadə olunur.",
      };
    }
  }

  if (formData.has("customDomain")) {
    if (!canManageCustomStorefront) {
      return { ok: false, message: "Şəxsi domain üçün əvvəlcə RAdmin subdomain icazəsi verməlidir." };
    }

    if (customDomain && !isValidCustomDomain(customDomain)) {
      return { ok: false, message: "Şəxsi domain düzgün deyil. Məsələn: shop.example.com" };
    }

    if (customDomain) {
      const { data: domainOwner } = await (supabaseAdmin as any)
        .from("stores")
        .select("id")
        .eq("settings->>customDomain", customDomain)
        .neq("id", storeId)
        .maybeSingle();

      if (domainOwner) {
        return { ok: false, message: "Bu domain başqa mağazaya bağlıdır." };
      }
    }
  }

  try {
    const payload: Record<string, unknown> = { name, slug: nextSlug };

    if (
      formData.has("heroTitle") ||
      formData.has("heroSubtitle") ||
      formData.has("customDomain") ||
      formData.has("aboutContent") ||
      formData.has("socialInstagram") ||
      formData.has("socialTiktok") || formData.has("profitTrackingPresent") ||
      formData.has("featuredCategoriesPresent") ||
      Object.keys(bannerPosition).length > 0
    ) {
      const settings = currentSettings;
      if (formData.has("profitTrackingPresent")) {
        settings.profitTrackingEnabled = formData.get("profitTrackingEnabled") === "on";
      }
      if (formData.has("featuredCategoriesPresent")) {
        settings.featuredCategoryIds = [...new Set(featuredCategoryIds)].slice(0, 4);
      }
      Object.assign(settings, bannerPosition);

      if (formData.has("heroTitle") && heroTitle) {
        settings.heroTitle = heroTitle;
      } else if (formData.has("heroTitle")) {
        delete settings.heroTitle;
      }

      if (formData.has("heroSubtitle") && heroSubtitle) {
        settings.heroSubtitle = heroSubtitle;
      } else if (formData.has("heroSubtitle")) {
        delete settings.heroSubtitle;
      }

      if (formData.has("customDomain") && customDomain) {
        settings.customDomain = customDomain;
      } else if (formData.has("customDomain")) {
        delete settings.customDomain;
      }

      if (formData.has("aboutContent") && aboutContent) {
        settings.aboutContent = aboutContent;
      } else if (formData.has("aboutContent")) {
        delete settings.aboutContent;
      }

      if (formData.has("socialInstagram") && socialInstagram) {
        settings.socialInstagram = socialInstagram;
      } else if (formData.has("socialInstagram")) {
        delete settings.socialInstagram;
      }

      if (formData.has("socialTiktok") && socialTiktok) {
        settings.socialTiktok = socialTiktok;
      } else if (formData.has("socialTiktok")) {
        delete settings.socialTiktok;
      }

      payload.settings = settings;
    }

    if (logoFile) {
      replacedUrls.push(store.logo_url);
      payload.logo_url = await uploadStoreMedia({
        file: logoFile,
        userId: current.user.id,
        storeId,
        kind: "logo",
      });
    }

    if (bannerFile) {
      replacedUrls.push(store.cover_url);
      payload.cover_url = await uploadStoreMedia({
        file: bannerFile,
        userId: current.user.id,
        storeId,
        kind: "banner",
      });
    }

    if (storefrontHeroFile && canManageCustomStorefront) {
      const previousHeroUrl =
        typeof currentSettings.storefrontHeroUrl === "string"
          ? currentSettings.storefrontHeroUrl
          : "";
      if (previousHeroUrl) replacedUrls.push(previousHeroUrl);
      const settings = readSettings(payload.settings ?? currentSettings);
      settings.storefrontHeroUrl = await uploadStoreMedia({
        file: storefrontHeroFile,
        userId: current.user.id,
        storeId,
        kind: "storefront-hero",
      });
      payload.settings = settings;
    }

    const { error } = await (supabaseAdmin as any)
      .from("stores")
      .update(payload)
      .eq("id", storeId)
      .eq("owner_id", current.user.id);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Ayarlar saxlanmadı.",
    };
  }

  revalidatePath("/store/dashboard/settings");
  revalidatePath("/store/dashboard", "layout");
  revalidatePath("/sell/product", "layout");
  revalidatePath("/admin/settings");
  invalidateStorePublicData({
    storeId,
    storeSlug: store.slug,
  });
  if (nextSlug !== store.slug) {
    invalidateStorePublicData({
      storeId,
      storeSlug: nextSlug,
    });
  }
  await deleteR2MediaAssetsByUrls(replacedUrls);

  return {
    ok: true,
    message: "Mağaza ayarları saxlandı.",
  };
}
