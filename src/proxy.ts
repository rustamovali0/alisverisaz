import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import {
  getSharedCookieDomain,
  getStoreSubdomainSlug,
} from "@/lib/config/domains";
import { updateSession } from "@/lib/supabase/middleware";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

function resolveCookieLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const hasValidCookie = routing.locales.includes(cookieLocale as any);

  return {
    locale: hasValidCookie ? cookieLocale : routing.defaultLocale,
    shouldSetLocaleCookie: !hasValidCookie,
  };
}

function setLocaleCookie(response: NextResponse, locale: string, host?: string | null) {
  const domain = getSharedCookieDomain(host);

  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
  });
}

function splitLocalePath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const [, maybeLocale, ...rest] = pathname.split("/");

  if (routing.locales.includes(maybeLocale as any)) {
    const locale = maybeLocale as string;

    return {
      locale,
      visiblePathname: `/${rest.join("/")}`.replace(/\/$/, "") || "/",
      shouldRedirectClean: true,
      shouldSetLocaleCookie: true,
    };
  }

  if (/^[a-z]{2}$/i.test(maybeLocale ?? "")) {
    return {
      locale: routing.defaultLocale,
      visiblePathname: `/${rest.join("/")}`.replace(/\/$/, "") || "/",
      shouldRedirectClean: true,
      shouldSetLocaleCookie: true,
    };
  }

  const resolved = resolveCookieLocale(request);

  return {
    locale: resolved.locale,
    visiblePathname: pathname,
    shouldRedirectClean: false,
    shouldSetLocaleCookie: resolved.shouldSetLocaleCookie,
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

function createLocalizedRewrite(
  request: NextRequest,
  pathname: string,
  locale: string,
  shouldSetLocaleCookie: boolean,
) {
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
  if (shouldSetLocaleCookie) {
    setLocaleCookie(response, locale, request.headers.get("host"));
  }

  return response;
}

function createCleanLocaleRedirect(request: NextRequest, pathname: string, locale: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const response = NextResponse.redirect(url, 308);
  setLocaleCookie(response, locale, request.headers.get("host"));

  return response;
}

function resolveSubdomainPath(pathname: string, storeSlug: string) {
  if (pathname === "/" || pathname === `/${storeSlug}` || pathname === "/products") {
    return `/${storeSlug}`;
  }

  if (pathname.startsWith("/products/")) {
    return `/${storeSlug}${pathname}`;
  }

  if (pathname.startsWith(`/${storeSlug}/products/`)) {
    return pathname;
  }

  return pathname;
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
  const { locale, visiblePathname, shouldRedirectClean, shouldSetLocaleCookie } = splitLocalePath(request);
  const safeLocale = locale ?? routing.defaultLocale;

  if (shouldRedirectClean) {
    return createCleanLocaleRedirect(request, visiblePathname, safeLocale);
  }

  const storeSubdomainSlug = getStoreSubdomainSlug(request.headers.get("host"));
  const effectivePathname = storeSubdomainSlug
    ? resolveSubdomainPath(visiblePathname, storeSubdomainSlug)
    : visiblePathname;

  const rewriteResponse = createLocalizedRewrite(
    request,
    effectivePathname,
    safeLocale,
    shouldSetLocaleCookie,
  );

  if (!needsSessionCheck(effectivePathname)) {
    return rewriteResponse;
  }

  return mergeSessionIntoRewrite(request, rewriteResponse);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|favicon.ico|.*\\..*).*)"],
};
