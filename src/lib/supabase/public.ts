import "server-only";

import { createClient } from "@supabase/supabase-js";

import { clientEnv } from "@/lib/config/env.client";
import type { Database } from "@/types/database";

export function createSupabasePublicClient() {
  return createClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabasePublishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
