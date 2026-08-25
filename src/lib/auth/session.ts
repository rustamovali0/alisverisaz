import { redirect } from "next/navigation";
import { cache } from "react";

import { getDashboardPath, getLoginPath } from "@/lib/auth/redirects";
import type { AuthRole } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const getCurrentUserProfile = cache(async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,phone,role,created_at,updated_at")
    .eq("id", user.id)
    .returns<ProfileRow[]>()
    .maybeSingle();

  return {
    user,
    profile,
    role: profile?.role ?? "customer",
  };
});

export async function requireUser(nextPath?: string) {
  const current = await getCurrentUserProfile();

  if (!current) {
    redirect(getLoginPath(nextPath));
  }

  return current;
}

export async function requireRole(allowedRoles: AuthRole[], nextPath?: string) {
  const current = await requireUser(nextPath);

  if (!allowedRoles.includes(current.role)) {
    if (current.role === "admin") {
      redirect(getDashboardPath(current.role));
    }

    redirect(getDashboardPath(current.role));
  }

  return current as typeof current & {
    profile: ProfileRow | null;
    role: AuthRole;
  };
}
