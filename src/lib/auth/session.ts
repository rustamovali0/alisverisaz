import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";

import { getAdminLoginPath, getDashboardPath, getLoginPath } from "@/lib/auth/redirects";
import type { AuthRole } from "@/lib/auth/types";
import { isSessionRevoked } from "@/lib/auth/session-revocation";
import { getSystemFlags } from "@/lib/platform/system-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveAuthScopeFromPath, type SupabaseAuthScope } from "@/lib/supabase/auth-scope";
import type { Database } from "@/types/database";
import { getAuthProfile } from "@/lib/auth/profile-query";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const getCurrentUserProfile = cache(async function getCurrentUserProfile(
  authScope: SupabaseAuthScope = "public",
) {
  const supabase = await createSupabaseServerClient({ authScope });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await getAuthProfile(supabase, user.id);

  if (profileError || !profile) return null;

  const revokedAt =
    typeof profile?.session_revoked_at === "string"
      ? Date.parse(profile.session_revoked_at)
      : Number.NaN;

  if (Number.isFinite(revokedAt)) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (isSessionRevoked(profile.session_revoked_at, session?.access_token)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      return null;
    }
  }

  return {
    user,
    profile,
    role: profile?.role ?? "customer",
  };
});

export async function requireUser(nextPath?: string, authScope: SupabaseAuthScope = "public") {
  const current = await getCurrentUserProfile(authScope);

  if (!current) {
    redirect(authScope === "admin" ? getAdminLoginPath(nextPath) : getLoginPath(nextPath));
  }

  return current;
}

export async function requireRole(allowedRoles: AuthRole[], nextPath?: string) {
  const requestScope = resolveAuthScopeFromPath((await headers()).get("x-current-path"));
  const authScope = allowedRoles.includes("admin") &&
    (allowedRoles.length === 1 || requestScope === "admin") ? "admin" : "public";
  const current = await requireUser(nextPath, authScope);

  if (!allowedRoles.includes(current.role)) {
    redirect(getDashboardPath(current.role));
  }

  const flags = await getSystemFlags();
  if (current.role === "admin" && !flags.admin_panel_enabled) {
    throw new Error("Admin panel deaktivdir.");
  }

  if (current.role === "seller" && !flags.seller_panel_enabled) {
    throw new Error("Satıcı paneli deaktivdir.");
  }

  if (current.role === "customer" && !flags.user_access_enabled) {
    throw new Error("İstifadəçi girişi deaktivdir.");
  }

  return current as typeof current & {
    profile: ProfileRow | null;
    role: AuthRole;
  };
}
