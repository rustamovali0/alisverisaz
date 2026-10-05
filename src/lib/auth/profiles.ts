import { isAuthRole, type AuthRole } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function slugifyStoreName(value: string) {
  const slug = value
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

  return slug || "magaza";
}

export async function ensureAuthProfile(input: {
  id: string;
  email: string | null;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role?: unknown;
}) {
  const role: AuthRole = isAuthRole(input.role) ? input.role : "customer";
  const supabaseAdmin = createSupabaseAdminClient();
  const row: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: AuthRole;
    phone?: string | null;
    avatar_url?: string | null;
  } = {
    id: input.id,
    email: input.email,
    full_name: input.fullName ?? null,
    role,
  };

  if (input.phone !== undefined) {
    row.phone = input.phone;
  }

  if (input.avatarUrl !== undefined) {
    row.avatar_url = input.avatarUrl;
  }

  const { error } = await supabaseAdmin.from("profiles").upsert(
    row,
    {
      onConflict: "id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureSellerStore(input: {
  userId: string;
  name?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existingStore, error: existingError } = await (supabaseAdmin as any)
    .from("stores")
    .select("id,logo_url,cover_url")
    .eq("owner_id", input.userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingStore) {
    const payload: Record<string, string> = {};

    if (!existingStore.logo_url && input.logoUrl) {
      payload.logo_url = input.logoUrl;
    }

    if (!existingStore.cover_url && input.coverUrl) {
      payload.cover_url = input.coverUrl;
    }

    if (Object.keys(payload).length > 0) {
      const { error } = await (supabaseAdmin as any)
        .from("stores")
        .update(payload)
        .eq("id", existingStore.id);

      if (error) {
        throw new Error(error.message);
      }
    }

    return existingStore.id as string;
  }

  const storeName = (input.name ?? "").trim() || "Yeni mağaza";
  const storeSlug = `${slugifyStoreName(storeName)}-${input.userId.slice(0, 8)}`;
  const { data: store, error } = await (supabaseAdmin as any)
    .from("stores")
    .insert({
      owner_id: input.userId,
      name: storeName,
      slug: storeSlug,
      description: input.description ?? "Satıcı mağazası",
      logo_url: input.logoUrl ?? null,
      cover_url: input.coverUrl ?? null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return store.id as string;
}
