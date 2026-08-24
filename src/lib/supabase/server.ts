import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { headers } from "next/headers";

import { clientEnv } from "@/lib/config/env.client";
import { getSharedCookieDomain } from "@/lib/config/domains";
import type { Database } from "@/types/database";

type CookiesToSet = Array<{
  name: string;
  value: string;
  options: CookieOptions;
}>;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const sharedCookieDomain = getSharedCookieDomain((await headers()).get("host"));

  return createServerClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                ...(sharedCookieDomain ? { domain: sharedCookieDomain } : {}),
              });
            });
          } catch {
            // Server Components cannot set cookies; middleware refreshes sessions.
          }
        },
      },
    },
  );
}
