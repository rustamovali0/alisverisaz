import { NextResponse } from "next/server";
import { normalizeNextPath } from "@/lib/auth/safe-redirect";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextPath = normalizeNextPath(
    requestUrl.searchParams.get("next"),
    "/reset-password?mode=recovery",
  );
  const expiredUrl = new URL("/forgot-password", origin);

  expiredUrl.searchParams.set("reset", "expired");

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(expiredUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return NextResponse.redirect(expiredUrl);
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
