import { isAuthRole, type AuthRole } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
}) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data: existingStore, error: existingError } = await (supabaseAdmin as any)
    .from("stores")
    .select("id")
    .eq("owner_id", input.userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingStore) {
    return existingStore.id as string;
  }

  const storeName = (input.name ?? "").trim() || "Yeni mağaza";
  const { data: store, error } = await (supabaseAdmin as any)
    .from("stores")
    .insert({
      owner_id: input.userId,
      name: storeName,
      description: input.description ?? "Satıcı mağazası",
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return store.id as string;
}
