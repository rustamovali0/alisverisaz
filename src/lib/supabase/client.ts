"use client";

import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/config/env.client";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      clientEnv.supabaseUrl,
      clientEnv.supabasePublishableKey,
    );
  }

  return browserClient;
}
