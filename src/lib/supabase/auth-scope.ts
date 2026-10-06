export type SupabaseAuthScope = "public" | "admin";

export const ADMIN_SUPABASE_COOKIE_NAME = "sb-alisveris-admin-auth-token";
// A separate namespace avoids legacy host-only/shared-domain cookie collisions.
export const PUBLIC_SUPABASE_COOKIE_NAME = "sb-alisveris-public-auth-token-v2";

export function getSupabaseCookieName(scope: SupabaseAuthScope) {
  return scope === "admin" ? ADMIN_SUPABASE_COOKIE_NAME : PUBLIC_SUPABASE_COOKIE_NAME;
}

export function resolveAuthScopeFromPath(pathname?: string | null): SupabaseAuthScope {
  return pathname === "/radmin" || pathname?.startsWith("/radmin/")
    ? "admin"
    : "public";
}
