import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import {
  getSharedCookieDomain,
  getStoreSubdomainSlug,
  isReservedStoreSubdomain,
  isValidStoreSlug,
} from "@/lib/config/domains";
import { getSystemFlagsForProxy } from "@/lib/platform/system-settings-proxy";
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

function createMaintenanceResponse(title: string, description: string) {
  return new NextResponse(
    `<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eefaf6;color:#101828;font-family:Inter,system-ui,sans-serif}.card{max-width:560px;margin:24px;padding:32px;border:1px solid #bfeff2;border-radius:20px;background:#fff;box-shadow:0 20px 60px rgba(15,23,42,.08)}h1{margin:0 0 12px;font-size:28px}p{margin:0;color:#5f6f7d;line-height:1.6}</style></head><body><main class="card"><h1>${title}</h1><p>${description}</p></main></body></html>`,
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

async function getAccessBlockResponse(pathname: string) {
  const flags = await getSystemFlagsForProxy();

  if (
    !flags.site_enabled &&
    !pathname.startsWith("/radmin") &&
    pathname !== "/favicon.ico"
  ) {
    return createMaintenanceResponse(
      "Sayt texniki xidmət rejimindədir",
      "Sayt müvəqqəti olaraq texniki xidmət rejimindədir.",
    );
  }

  if (!flags.admin_panel_enabled && pathname.startsWith("/radmin")) {
    return createMaintenanceResponse(
      "Admin panel offline-dır",
      "Radmin panel müvəqqəti olaraq deaktiv edilib.",
    );
  }

  if (
    !flags.seller_panel_enabled &&
    (pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/store/dashboard") ||
      pathname.startsWith("/seller") ||
      pathname === "/sell")
  ) {
    return createMaintenanceResponse(
      "Satıcı paneli bağlıdır",
      "Satıcı panellərinə giriş müvəqqəti olaraq deaktiv edilib.",
    );
  }

  if (
    !flags.user_access_enabled &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/dashboard"))
  ) {
    return createMaintenanceResponse(
      "İstifadəçi girişi bağlıdır",
      "İstifadəçi girişləri və qeydiyyatı müvəqqəti olaraq deaktiv edilib.",
    );
  }

  return null;
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

function resolveStorePath(pathname: string) {
  const match = pathname.match(
    /^\/store\/([^/]+)(\/products\/[^/]+(?:\/questions)?)?\/?$/,
  );

  if (!match) {
    return pathname;
  }

  const [, storeSlug, suffix = ""] = match;

  if (!isValidStoreSlug(storeSlug) || isReservedStoreSubdomain(storeSlug)) {
    return pathname;
  }

  return `/${storeSlug}${suffix}`;
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
    : resolveStorePath(visiblePathname);
  const accessBlockResponse = await getAccessBlockResponse(effectivePathname);

  if (accessBlockResponse) {
    return accessBlockResponse;
  }

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
