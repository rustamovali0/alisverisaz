import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

function splitLocalePath(pathname: string) {
  const [, maybeLocale, ...rest] = pathname.split("/");

  if (routing.locales.includes(maybeLocale as any)) {
    return {
      locale: maybeLocale,
      visiblePathname: `/${rest.join("/")}`.replace(/\/$/, "") || "/",
      hadLocalePrefix: true,
    };
  }

  return {
    locale: routing.defaultLocale,
    visiblePathname: pathname,
    hadLocalePrefix: false,
  };
}

function needsSessionCheck(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/radmin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/store/dashboard")
  );
}

function localizedInternalPath(locale: string, pathname: string) {
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

function createLocalizedRewrite(request: NextRequest, pathname: string, locale: string) {
  const url = request.nextUrl.clone();

  if (
    (pathname === "/radmin" || pathname.startsWith("/radmin/")) &&
    pathname !== "/radmin/login"
  ) {
    url.pathname = localizedInternalPath(locale, pathname.replace(/^\/radmin/, "/admin"));
  } else if (pathname === "/admin") {
    url.pathname = localizedInternalPath(locale, "/store/dashboard");
  } else if (pathname.startsWith("/admin/")) {
    url.pathname = localizedInternalPath(locale, pathname.replace(/^\/admin/, "/store/dashboard"));
  } else {
    url.pathname = localizedInternalPath(locale, pathname);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-NEXT-INTL-LOCALE", locale);
  requestHeaders.set("x-current-path", pathname);

  const response = NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
  });

  return response;
}

function createLocalizedNextResponse(request: NextRequest, pathname: string, locale: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", pathname);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set("NEXT_LOCALE", locale, {
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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { locale, visiblePathname, hadLocalePrefix } = splitLocalePath(pathname);

  if (hadLocalePrefix) {
    if (
      (visiblePathname === "/radmin" || visiblePathname.startsWith("/radmin/")) &&
      visiblePathname !== "/radmin/login"
    ) {
      return mergeSessionIntoRewrite(
        request,
        createLocalizedRewrite(request, visiblePathname, locale),
      );
    }

    if (visiblePathname === "/admin") {
      return mergeSessionIntoRewrite(
        request,
        createLocalizedRewrite(request, visiblePathname, locale),
      );
    }

    if (visiblePathname.startsWith("/admin/")) {
      return mergeSessionIntoRewrite(
        request,
        createLocalizedRewrite(request, visiblePathname, locale),
      );
    }

    return needsSessionCheck(visiblePathname)
      ? updateSession(request, createLocalizedNextResponse(request, visiblePathname, locale))
      : createLocalizedNextResponse(request, visiblePathname, locale);
  }

  const rewriteResponse = createLocalizedRewrite(request, pathname, locale);

  if (!needsSessionCheck(pathname)) {
    return rewriteResponse;
  }

  return mergeSessionIntoRewrite(request, rewriteResponse);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|favicon.ico|.*\\..*).*)"],
};
