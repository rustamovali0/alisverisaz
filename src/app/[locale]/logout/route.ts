import { NextResponse } from "next/server";

import { trackActivityEvent } from "@/lib/activity/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LogoutRouteContext = {
  params: Promise<{
    locale: string;
  }>;
};

function isCrossSiteRequest(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    return true;
  }

  if (origin && origin !== url.origin) {
    return true;
  }

  if (referer) {
    try {
      return new URL(referer).origin !== url.origin;
    } catch {
      return true;
    }
  }

  return false;
}

export async function GET(request: Request, context: LogoutRouteContext) {
  await context.params;

  if (isCrossSiteRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  await supabase.auth.signOut();
  await trackActivityEvent({
    eventType: "user_logout",
    actorId: data.user?.id ?? null,
    metadata: {
      title: "Logout",
      description: data.user?.email ?? "Hesabdan çıxış edildi",
      email: data.user?.email,
    },
  });

  return NextResponse.redirect(new URL("/admin", request.url));
}
