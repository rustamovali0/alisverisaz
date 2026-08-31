import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { headers } from "next/headers";

import { clientEnv } from "@/lib/config/env.client";
import { getSharedCookieDomain } from "@/lib/config/domains";
import {
  getSupabaseCookieName,
  resolveAuthScopeFromPath,
  type SupabaseAuthScope,
} from "@/lib/supabase/auth-scope";
import type { Database } from "@/types/database";

type CookiesToSet = Array<{
  name: string;
  value: string;
  options: CookieOptions;
}>;

export async function createSupabaseServerClient(options?: {
  authScope?: SupabaseAuthScope;
}) {
  const cookieStore = await cookies();
  const headerList = await headers();
  const sharedCookieDomain = getSharedCookieDomain(headerList.get("host"));
  const authScope =
    options?.authScope ?? resolveAuthScopeFromPath(headerList.get("x-current-path"));
  const cookieName = getSupabaseCookieName(authScope);

  return createServerClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabasePublishableKey,
    {
      ...(cookieName ? { cookieOptions: { name: cookieName } } : {}),
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
