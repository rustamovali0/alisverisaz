import { NextResponse } from "next/server";

import { ensureAuthProfile } from "@/lib/auth/profiles";
import { isAuthRole, type AuthRole } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=google", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=google", origin));
  }

  const metadata = data.user.user_metadata ?? {};
  const metadataRole = metadata.role;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .returns<Array<{ role: AuthRole | null }>>()
    .maybeSingle();

  if (profile?.role === "admin") {
    await supabase.auth.signOut();

    return NextResponse.redirect(new URL("/login?error=google-admin", origin));
  }

  const role: AuthRole = isAuthRole(profile?.role)
    ? profile.role
    :
    isAuthRole(metadataRole) && metadataRole !== "admin" ? metadataRole : "customer";

  try {
    await ensureAuthProfile({
      id: data.user.id,
      email: data.user.email ?? null,
      fullName:
        readMetadataString(metadata, ["full_name", "name"]) ?? data.user.email ?? null,
      avatarUrl: readMetadataString(metadata, ["avatar_url", "picture"]),
      role,
    });
  } catch {
    return NextResponse.redirect(new URL("/login?error=profile", origin));
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
