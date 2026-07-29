"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORE_MEDIA_BUCKET = "cms-media";
const MAX_MEDIA_SIZE = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureStoreMediaBucket() {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: bucket } = await supabaseAdmin.storage.getBucket(STORE_MEDIA_BUCKET);

  if (bucket) {
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(STORE_MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: MAX_MEDIA_SIZE,
    allowedMimeTypes: ALLOWED_MEDIA_TYPES,
  });

  if (error && !error.message.toLowerCase().includes("already")) {
    throw new Error("Şəkil yükləmə yaddaşı hazır deyil. Supabase storage bucket yaradılmalıdır.");
  }
}

async function uploadStoreMedia(input: {
  file: File;
  userId: string;
  storeId: string;
  kind: "logo" | "banner";
}) {
  if (input.file.size > MAX_MEDIA_SIZE) {
    throw new Error("Şəkil maksimum 5MB ola bilər.");
  }

  if (!ALLOWED_MEDIA_TYPES.includes(input.file.type)) {
    throw new Error("Yalnız JPG, PNG və WebP şəkillər qəbul edilir.");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  await ensureStoreMediaBucket();

  const fileName = sanitizeFileName(input.file.name) || `${input.kind}.webp`;
  const path = `stores/${input.storeId}/${input.kind}/${crypto.randomUUID()}-${fileName}`;
  const body = new Uint8Array(await input.file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(STORE_MEDIA_BUCKET)
    .upload(path, body, {
      contentType: input.file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes("bucket")
        ? "Şəkil yükləmə yaddaşı tapılmadı. Supabase-də cms-media bucket yaradın."
        : error.message,
    );
  }

  const { data } = supabaseAdmin.storage.from(STORE_MEDIA_BUCKET).getPublicUrl(path);

  await (supabaseAdmin as any).from("media_assets").insert({
    bucket: STORE_MEDIA_BUCKET,
    path,
    url: data.publicUrl,
    file_name: input.file.name,
    mime_type: input.file.type,
    size_bytes: input.file.size,
    alt_text: input.kind === "logo" ? "Mağaza logosu" : "Mağaza banneri",
    created_by: input.userId,
    updated_by: input.userId,
  });

  return data.publicUrl;
}

export async function updateSellerStoreSettingsAction(
  formData: FormData,
): Promise<StoreSettingsResult> {
  const current = await requireRole(["seller"], "/store/dashboard/settings");
  const storeId = readString(formData, "storeId");
  const name = readString(formData, "name");
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
    .select("id,owner_id")
    .eq("id", storeId)
    .eq("owner_id", current.user.id)
    .maybeSingle();

  if (!store) {
    return {
      ok: false,
      message: "Mağaza tapılmadı.",
    };
  }

  try {
    const payload: Record<string, string> = { name };

    if (logoFile) {
      payload.logo_url = await uploadStoreMedia({
        file: logoFile,
        userId: current.user.id,
        storeId,
        kind: "logo",
      });
    }

    if (bannerFile) {
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
  revalidatePath("/");
  revalidatePath("/products");
  revalidateTag("public-marketplace", "max");

  return {
    ok: true,
    message: "Mağaza ayarları saxlandı.",
  };
}
