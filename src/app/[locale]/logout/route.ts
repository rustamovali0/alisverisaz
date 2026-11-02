import { NextResponse } from "next/server";

import { trackActivityEvent } from "@/lib/activity/events";
import { clientEnv } from "@/lib/config/env.client";
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

function getPublicOrigin() {
  const configuredOrigin = new URL(clientEnv.appUrl).origin;
  const hostname = new URL(configuredOrigin).hostname;

  if (
    process.env.NODE_ENV === "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
  ) {
    return `https://${clientEnv.storeRootDomain}`;
  }

  return configuredOrigin;
}

export async function POST(request: Request, context: LogoutRouteContext) {
  await context.params;

  if (isCrossSiteRequest(request) || request.headers.get("origin") !== getPublicOrigin()) {
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

  return NextResponse.redirect(new URL("/login", getPublicOrigin()),303);
}

// GET must be side-effect-free (links, crawlers, prefetch and mail scanners).
export async function GET() {
  return new Response(`<!doctype html><html lang="az"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hesabdan çıxış</title></head><body><main><h1>Hesabdan çıxış</h1><p>Hesabınızdan çıxmaq istəyirsiniz?</p><form method="post"><button type="submit">Hesabdan çıx</button></form><a href="/">Ana səhifəyə qayıt</a></main></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex"}});
}
