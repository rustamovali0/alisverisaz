import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/config/env.server";
import type { Database } from "@/types/database";

export function createSupabaseAdminClient() {
  if (!serverEnv.supabaseSecretKey) {
    throw new Error(
      "Missing required server environment variable: SUPABASE_SECRET_KEY",
    );
  }

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
