"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { invalidateStorePublicData } from "@/lib/cache/public-cache";
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
  const heroTitle = readString(formData, "heroTitle");
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

  try {
    const payload: Record<string, unknown> = { name };

    if (formData.has("heroTitle")) {
      const settings = readSettings(store.settings);

      if (heroTitle) {
        settings.heroTitle = heroTitle;
      } else {
        delete settings.heroTitle;
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
  await deleteR2MediaAssetsByUrls(replacedUrls);

  return {
    ok: true,
    message: "Mağaza ayarları saxlandı.",
  };
}
