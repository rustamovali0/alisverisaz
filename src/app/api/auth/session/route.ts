import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") === "admin" ? "admin" : "public";
  const current = await getCurrentUserProfile(scope);
  const includeProfile = request.nextUrl.searchParams.get("profile") === "1";
  let storeLogo: string | null = null;
  if (includeProfile && current?.role === "seller") {
    try {
      const { createSupabaseServerClient } = await import("@/lib/supabase/server");
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.from("stores").select("logo_url")
        .eq("owner_id", current.user.id).limit(1)
        .returns<{ logo_url: string | null }[]>().maybeSingle();
      storeLogo = data?.logo_url ?? null;
    } catch {
      // A missing store logo must not hide an authenticated account.
    }
  }
  return NextResponse.json(
    {
      authenticated: Boolean(current), role: current?.role ?? null,
      ...(includeProfile ? { profile: current ? {
        status: "authenticated",
        userId: current.user.id,
        role: current.role,
        email: current.profile.email ?? current.user.email ?? null,
        fullName: current.profile.full_name ?? null,
        avatarUrl: storeLogo ?? current.profile.avatar_url ?? null,
      } : null } : {}),
    },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=0, must-revalidate" },
    },
  );
}
