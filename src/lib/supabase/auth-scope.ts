export type SupabaseAuthScope = "public" | "admin";

export const ADMIN_SUPABASE_COOKIE_NAME = "sb-alisveris-admin-auth-token";

export function getSupabaseCookieName(scope: SupabaseAuthScope) {
  return scope === "admin" ? ADMIN_SUPABASE_COOKIE_NAME : undefined;
}

export function resolveAuthScopeFromPath(pathname?: string | null): SupabaseAuthScope {
  return pathname === "/radmin" || pathname?.startsWith("/radmin/")
    ? "admin"
    : "public";
}
