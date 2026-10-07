import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const PROFILE_COLUMNS = "id,email,full_name,avatar_url,phone,role,created_at,updated_at";
type AuthProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & { session_revoked_at?: string | null };

export async function getAuthProfile(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const read = (columns: string) => supabase.from("profiles").select(columns)
    .eq("id", userId).returns<AuthProfileRow[]>().maybeSingle();
  const result = await read(`${PROFILE_COLUMNS},session_revoked_at`);
  // Keep older installations working until their revocation migration is applied.
  if (result.error && ["42703", "PGRST204"].includes(result.error.code) && result.error.message.includes("session_revoked_at")) {
    return read(PROFILE_COLUMNS);
  }
  return result;
}
