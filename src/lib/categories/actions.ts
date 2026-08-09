"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

function revalidateCategorySurfaces() {
  revalidateTag("public-categories", "max");
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/radmin/categories");
  revalidatePath("/az");
  revalidatePath("/az/products");
  revalidatePath("/az/radmin/categories");
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

export async function createCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  await requireRole(["admin"], "/radmin/categories");
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
  const { error } = await (supabase as any).from("categories").insert({
    parent_id: parentId,
    name,
    slug,
    description: readString(formData, "description") || null,
    sort_order: readNumber(formData, "sortOrder"),
    is_active: readBoolean(formData, "isActive"),
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateCategorySurfaces();

  return {
    ok: true,
    message: "Kateqoriya yaradıldı.",
  };
}

export async function updateCategoryAction(
  formData: FormData,
): Promise<CategoryActionResult> {
  await requireRole(["admin"], "/radmin/categories");
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
  const { error } = await (supabase as any)
    .from("categories")
    .update({
      parent_id: parentId === id ? null : parentId,
      name,
      slug,
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

  revalidateCategorySurfaces();

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
  const { error } = await (supabase as any).from("categories").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateCategorySurfaces();

  return {
    ok: true,
    message: "Kateqoriya silindi.",
  };
}
