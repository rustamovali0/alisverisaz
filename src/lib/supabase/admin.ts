import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/config/env.server";
import type { Database } from "@/types/database";

export function createSupabaseAdminClient() {
  return createClient<Database>(
    serverEnv.supabaseUrl,
    serverEnv.supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
