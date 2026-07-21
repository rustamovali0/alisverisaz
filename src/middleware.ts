import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

function stripLocalePath(pathname: string) {
  const localePrefix = `/${routing.defaultLocale}`;

  if (pathname === localePrefix) {
    return "/";
  }

  if (pathname.startsWith(`${localePrefix}/`)) {
    return pathname.slice(localePrefix.length);
  }

  return pathname;
}

function needsSessionCheck(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname === "/login" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/radmin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/store/dashboard")
  );
}

function createLocalizedRewrite(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();

  if (
    (pathname === "/radmin" || pathname.startsWith("/radmin/")) &&
    pathname !== "/radmin/login"
  ) {
    url.pathname = `/${routing.defaultLocale}${pathname.replace(/^\/radmin/, "/admin")}`;
  } else if (pathname === "/admin") {
    url.pathname = `/${routing.defaultLocale}/login`;
  } else {
    url.pathname =
      pathname === "/" ? `/${routing.defaultLocale}` : `/${routing.defaultLocale}${pathname}`;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-NEXT-INTL-LOCALE", routing.defaultLocale);

  const response = NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set("NEXT_LOCALE", routing.defaultLocale, {
    path: "/",
    sameSite: "lax",
  });

  return response;
}

function createLocalizedNextResponse() {
  const response = NextResponse.next();
  response.cookies.set("NEXT_LOCALE", routing.defaultLocale, {
    path: "/",
    sameSite: "lax",
  });

  return response;
}

async function mergeSessionIntoRewrite(request: NextRequest, rewriteResponse: NextResponse) {
  const sessionResponse = await updateSession(request);

  if (sessionResponse.headers.get("location")) {
    return sessionResponse;
  }

  copyCookies(sessionResponse, rewriteResponse);

  return rewriteResponse;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const visiblePathname = stripLocalePath(pathname);

  if (visiblePathname !== pathname) {
    if (visiblePathname === "/admin") {
      return createLocalizedRewrite(request, visiblePathname);
    }

    return needsSessionCheck(visiblePathname)
      ? updateSession(request)
      : createLocalizedNextResponse();
  }

  const rewriteResponse = createLocalizedRewrite(request, pathname);

  if (!needsSessionCheck(pathname)) {
    return rewriteResponse;
  }

  if (pathname === "/admin") {
    return rewriteResponse;
  }

  return mergeSessionIntoRewrite(request, rewriteResponse);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|favicon.ico|.*\\..*).*)"],
};
