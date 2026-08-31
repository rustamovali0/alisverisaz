import { redirect } from "next/navigation";
import { cache } from "react";

import { getDashboardPath, getLoginPath } from "@/lib/auth/redirects";
import type { AuthRole } from "@/lib/auth/types";
import { getSystemFlags } from "@/lib/platform/system-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseAuthScope } from "@/lib/supabase/auth-scope";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileWithRevocation = ProfileRow & {
  session_revoked_at?: string | null;
};

function getJwtIssuedAt(accessToken?: string | null) {
  if (!accessToken) {
    return null;
  }

  try {
    const [, payload] = accessToken.split(".");
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      iat?: unknown;
    };

    return typeof decoded.iat === "number" ? decoded.iat : null;
  } catch {
    return null;
  }
}

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,phone,role,created_at,updated_at,session_revoked_at")
    .eq("id", user.id)
    .returns<ProfileWithRevocation[]>()
    .maybeSingle();

  const revokedAt =
    typeof profile?.session_revoked_at === "string"
      ? Date.parse(profile.session_revoked_at)
      : Number.NaN;

  if (Number.isFinite(revokedAt)) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const issuedAt = getJwtIssuedAt(session?.access_token);

    if (issuedAt !== null && revokedAt > issuedAt * 1000) {
      await supabase.auth.signOut().catch(() => undefined);
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
    redirect(getLoginPath(nextPath));
  }

  return current;
}

export async function requireRole(allowedRoles: AuthRole[], nextPath?: string) {
  const authScope =
    allowedRoles.length === 1 && allowedRoles[0] === "admin" ? "admin" : "public";
  const current = await requireUser(nextPath, authScope);

  if (!allowedRoles.includes(current.role)) {
    if (current.role === "admin") {
      redirect(getDashboardPath(current.role));
    }

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
