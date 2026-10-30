import { NextResponse } from "next/server";
import { normalizeNextPath } from "@/lib/auth/safe-redirect";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function privateRedirect(url: URL) {
  const response=NextResponse.redirect(url);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

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
    return privateRedirect(expiredUrl);
  }

  const supabase = await createSupabaseServerClient({ authScope: "public", requireCookieWrite: true });
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return privateRedirect(expiredUrl);
  }

  return privateRedirect(new URL(nextPath, origin));
}
