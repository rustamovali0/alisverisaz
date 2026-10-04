"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { invalidateStorePublicData } from "@/lib/cache/public-cache";
import {
  isReservedStoreSubdomain,
  isValidStoreSlug,
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
  kind: "logo" | "banner";
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
    altText: input.kind === "logo" ? "Mağaza logosu" : "Mağaza banneri",
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
  const aboutContent = readString(formData, "aboutContent");
  const socialInstagram = readString(formData, "socialInstagram");
  const socialTiktok = readString(formData, "socialTiktok");
  const logoFile = readFile(formData, "logo");
  const bannerFile = readFile(formData, "banner");

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

  if (!isValidStoreSlug(nextSlug) || isReservedStoreSubdomain(nextSlug)) {
    return {
      ok: false,
      message: "Mağaza URL-i yalnız hərf, rəqəm və tire ola bilər; bu ad rezerv olunub.",
    };
  }

  if (nextSlug !== store.slug) {
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

  try {
    const payload: Record<string, unknown> = { name, slug: nextSlug };

    if (
      formData.has("heroTitle") ||
      formData.has("heroSubtitle") ||
      formData.has("aboutContent") ||
      formData.has("socialInstagram") ||
      formData.has("socialTiktok")
    ) {
      const settings = readSettings(store.settings);

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
