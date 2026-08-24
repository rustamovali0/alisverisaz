"use client";

import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/config/env.client";
import { getSharedCookieDomain } from "@/lib/config/domains";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const sharedCookieDomain =
      typeof window !== "undefined"
        ? getSharedCookieDomain(window.location.hostname)
        : undefined;

    browserClient = createBrowserClient<Database>(
      clientEnv.supabaseUrl,
      clientEnv.supabasePublishableKey,
      {
        cookieOptions: {
          path: "/",
          sameSite: "lax",
          ...(typeof window !== "undefined" && window.location.protocol === "https:"
            ? { secure: true }
            : {}),
          ...(sharedCookieDomain ? { domain: sharedCookieDomain } : {}),
        },
      },
    );
  }

  return browserClient;
}
