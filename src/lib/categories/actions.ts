"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { invalidateCategoryPublicData } from "@/lib/cache/public-cache";
import {
  deleteR2MediaAssetsByUrls,
  recordImageMediaAsset,
} from "@/lib/storage/media-assets";
import { uploadImageToR2 } from "@/lib/storage/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_CATEGORY_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_CATEGORY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type CategoryActionResult =
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

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));

  return Number.isFinite(value) ? value : 0;
}

function readBoolean(formData: FormData, key: string) {
  return readString(formData, key) === "on";
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);

  return value instanceof File && value.size > 0 ? value : null;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
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
      .replace(/(^-|-$)/g, "") || "kateqoriya"
  );
}

function revalidateCategorySurfaces(categoryId?: string | null) {
  invalidateCategoryPublicData({
    categoryId,
  });
  revalidatePath("/radmin/categories");
}

async function ensureUniqueSlug(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  slug: string;
  ignoreId?: string;
}) {
  let nextSlug = input.slug;
  let suffix = 2;

  for (;;) {
    let query = (input.supabase as any)
      .from("categories")
      .select("id")
      .eq("slug", nextSlug)
      .limit(1);

    if (input.ignoreId) {
      query = query.neq("id", input.ignoreId);
    }

    const { data } = await query;

    if (!data || data.length === 0) {
      return nextSlug;
    }

    nextSlug = `${input.slug}-${suffix}`;
    suffix += 1;
  }
}

async function uploadCategoryImage(input: {
  file: File;
  userId: string;
  categoryName: string;
}) {
  const uploaded = await uploadImageToR2({
    file: input.file,
    folder: `categories/${input.userId}`,
    maxSizeBytes: MAX_CATEGORY_IMAGE_SIZE,
    allowedMimeTypes: ALLOWED_CATEGORY_IMAGE_TYPES,
  });

  await recordImageMediaAsset({
    uploaded,
    originalFileName: input.file.name,
    altText: input.categoryName,
    userId: input.userId,
    metadata: {
      source: "category",
    },
  });

  return uploaded.url;
}

export async function createCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  const current = await requireRole(["admin"], "/radmin/categories");
  const name = readString(formData, "name");

  if (!name) {
    return {
      ok: false,
      message: "Kateqoriya adı boş ola bilməz.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const parentId = readString(formData, "parentId") || null;
  const slug = await ensureUniqueSlug({
    supabase,
    slug: slugify(readString(formData, "slug") || name),
  });
  let imageUrl: string | null = null;

  try {
    const imageFile = readFile(formData, "imageFile");

    if (imageFile) {
      imageUrl = await uploadCategoryImage({
        file: imageFile,
        userId: current.user.id,
        categoryName: name,
      });
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Kateqoriya şəkli yüklənmədi.",
    };
  }

  const { data: category, error } = await (supabase as any).from("categories").insert({
    parent_id: parentId,
    name,
    slug,
    image_url: imageUrl,
    description: readString(formData, "description") || null,
    sort_order: readNumber(formData, "sortOrder"),
    is_active: readBoolean(formData, "isActive"),
  }).select("id").single();

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateCategorySurfaces(category?.id);

  return {
    ok: true,
    message: "Kateqoriya yaradıldı.",
  };
}

export async function updateCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  const current = await requireRole(["admin"], "/radmin/categories");
  const id = readString(formData, "categoryId");
  const name = readString(formData, "name");

  if (!id || !name) {
    return {
      ok: false,
      message: "Kateqoriya məlumatı natamamdır.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const parentId = readString(formData, "parentId") || null;
  const slug = await ensureUniqueSlug({
    supabase,
    slug: slugify(readString(formData, "slug") || name),
    ignoreId: id,
  });
  const { data: existing } = await (supabase as any)
    .from("categories")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  let imageUrl = existing?.image_url ?? null;

  try {
    const imageFile = readFile(formData, "imageFile");

    if (imageFile) {
      imageUrl = await uploadCategoryImage({
        file: imageFile,
        userId: current.user.id,
        categoryName: name,
      });
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Kateqoriya şəkli yüklənmədi.",
    };
  }

  const { error } = await (supabase as any)
    .from("categories")
    .update({
      parent_id: parentId === id ? null : parentId,
      name,
      slug,
      image_url: imageUrl,
      description: readString(formData, "description") || null,
      sort_order: readNumber(formData, "sortOrder"),
      is_active: readBoolean(formData, "isActive"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await deleteR2MediaAssetsByUrls([existing?.image_url !== imageUrl ? existing?.image_url : ""]);
  revalidateCategorySurfaces(id);

  return {
    ok: true,
    message: "Kateqoriya yeniləndi.",
  };
}

export async function deleteCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  await requireRole(["admin"], "/radmin/categories");
  const id = readString(formData, "categoryId");

  if (!id) {
    return {
      ok: false,
      message: "Silinəcək kateqoriya tapılmadı.",
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data: existing } = await (supabase as any)
    .from("categories")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  const { error } = await (supabase as any).from("categories").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await deleteR2MediaAssetsByUrls([existing?.image_url]);
  revalidateCategorySurfaces(id);

  return {
    ok: true,
    message: "Kateqoriya silindi.",
  };
}
