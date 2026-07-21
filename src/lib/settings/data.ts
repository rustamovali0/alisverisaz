import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getDepositSettings() {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("platform_settings")
    .select("value")
    .eq("key", "deposit")
    .maybeSingle();

  return {
    enabled: Boolean(data?.value?.enabled),
  };
}
