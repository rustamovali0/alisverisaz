import "server-only";

import { createClient } from "@supabase/supabase-js";

import { clientEnv } from "@/lib/config/env.client";
import type { Database } from "@/types/database";

export function createSupabasePublicClient(options?: { requestTimeoutMs?: number }) {
  return createClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabasePublishableKey,
    {
      ...(options?.requestTimeoutMs ? { global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(options.requestTimeoutMs!) }) } } : {}),
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
