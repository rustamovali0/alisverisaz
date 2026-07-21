import { isAuthRole, type AuthRole } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function ensureAuthProfile(input: {
  id: string;
  email: string | null;
  fullName?: string | null;
  role?: unknown;
}) {
  const role: AuthRole = isAuthRole(input.role) ? input.role : "seller";
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      id: input.id,
      email: input.email,
      full_name: input.fullName ?? null,
      role,
    },
    {
      onConflict: "id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}
