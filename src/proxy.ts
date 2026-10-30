import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import {
  getSharedCookieDomain,
  getStoreRootDomain,
  getStoreSubdomainSlug,
  isValidCustomDomain,
  isReservedStoreSubdomain,
  isValidStoreSlug,
  normalizeHostname,
} from "@/lib/config/domains";
import { clientEnv } from "@/lib/config/env.client";
import { serverEnv } from "@/lib/config/env.server";
import { getSystemFlagsForProxy } from "@/lib/platform/system-settings-proxy";
import { updateSession } from "@/lib/supabase/middleware";

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
  currentPathHeader = pathname,
  virtualStoreSlug?: string | null,
) {
  const url = request.nextUrl.clone();
  // Behind nginx the public request is HTTPS while the standalone Next server
  // listens on local HTTP. Keep internal rewrites on HTTP so Next does not try
  // to open a TLS connection to its own plain-text port.
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    url.protocol = "http:";
  }

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
  requestHeaders.set("x-current-path", currentPathHeader);
  requestHeaders.set("x-current-url", `${currentPathHeader}${request.nextUrl.search}`);
  if (virtualStoreSlug) {
    const virtualHost = `${virtualStoreSlug}.${getStoreRootDomain()}`;
    requestHeaders.set("host", virtualHost);
    requestHeaders.set("x-forwarded-host", virtualHost);
    requestHeaders.set("x-custom-domain", normalizeHostname(request.headers.get("host")));
  }

  const response = NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
  if (request.method === "GET" || request.method === "HEAD") {
    response.headers.set("Cache-Control", "private, max-age=0, must-revalidate, no-transform");
  }
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
  if (pathname === "/" || pathname === `/${storeSlug}`) {
    return `/${storeSlug}`;
  }

  if (
    pathname === "/products" ||
    pathname === "/contact" ||
    pathname === "/cart" ||
    pathname.startsWith("/products/")
  ) {
    return `/${storeSlug}${pathname}`;
  }

  if (pathname.startsWith(`/${storeSlug}/`)) {
    return pathname;
  }

  return pathname;
}

const customDomainCache = new Map<string, { slug: string | null; expiresAt: number }>();
const storeSlugCache = new Map<string, { exists: boolean; expiresAt: number }>();

async function storeSlugExists(slug: string) {
  const cached = storeSlugCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.exists;
  }

  if (!serverEnv.supabaseSecretKey) {
    return true;
  }

  const url = new URL("/rest/v1/stores", clientEnv.supabaseUrl);
  url.searchParams.set("select", "id");
  url.searchParams.set("slug", `eq.${slug}`);
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serverEnv.supabaseSecretKey,
        authorization: `Bearer ${serverEnv.supabaseSecretKey}`,
      },
      cache: "no-store",
    });
    const rows = response.ok ? await response.json() as Array<{ id?: string }> : [];
    const exists = rows.length > 0;
    storeSlugCache.set(slug, { exists, expiresAt: Date.now() + 60_000 });
    return exists;
  } catch {
    return true;
  }
}

function createNotFoundResponse() {
  return new NextResponse(
    '<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Səhifə tapılmadı | Alışveriş.az</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a;font-family:Inter,system-ui,sans-serif}.card{max-width:520px;margin:24px;padding:32px;text-align:center;border:1px solid #e2e8f0;border-radius:20px;background:#fff}h1{margin:0 0 10px;font-size:28px}p{margin:0 0 22px;color:#64748b;line-height:1.6}a{display:inline-flex;min-height:44px;align-items:center;padding:0 18px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main class="card"><h1>Səhifə tapılmadı</h1><p>Axtardığınız səhifə mövcud deyil və ya silinib.</p><a href="/">Ana səhifəyə qayıt</a></main></body></html>',
    { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, max-age=0, must-revalidate, no-transform" } },
  );
}

function createMarketplaceHomeRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.hostname = getStoreRootDomain();
  url.port = "";
  url.pathname = "/";
  url.search = "";
  url.hash = "";

  return NextResponse.redirect(url, 308);
}

async function getCustomDomainStoreSlug(hostname: string | null | undefined) {
  const host = normalizeHostname(hostname);

  if (!isValidCustomDomain(host) || !serverEnv.supabaseSecretKey) {
    return null;
  }

  const cached = customDomainCache.get(host);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug;
  }

  const url = new URL("/rest/v1/stores", clientEnv.supabaseUrl);
  url.searchParams.set("select", "slug");
  url.searchParams.set("settings->>customDomain", `eq.${host}`);
  url.searchParams.set("settings->>customStorefrontEnabled", "eq.true");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serverEnv.supabaseSecretKey,
        authorization: `Bearer ${serverEnv.supabaseSecretKey}`,
      },
      cache: "no-store",
    });
    const rows = response.ok ? await response.json() as Array<{ slug?: string }> : [];
    const slug = rows[0]?.slug && isValidStoreSlug(rows[0].slug) ? rows[0].slug : null;
    customDomainCache.set(host, { slug, expiresAt: Date.now() + 60_000 });

    return slug;
  } catch {
    customDomainCache.set(host, { slug: null, expiresAt: Date.now() + 10_000 });
    return null;
  }
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
  return updateSession(request, rewriteResponse);
}

export async function proxy(request: NextRequest) {
  const { locale, visiblePathname, shouldRedirectClean, shouldSetLocaleCookie } = splitLocalePath(request);
  const safeLocale = locale ?? routing.defaultLocale;

  if (shouldRedirectClean) {
    return createCleanLocaleRedirect(request, visiblePathname, safeLocale);
  }

  const nativeStoreSubdomainSlug = getStoreSubdomainSlug(request.headers.get("host"));
  const customDomainStoreSlug = nativeStoreSubdomainSlug
    ? null
    : await getCustomDomainStoreSlug(request.headers.get("host"));
  const storeSubdomainSlug = nativeStoreSubdomainSlug ?? customDomainStoreSlug;
  const firstPathSegment = visiblePathname.split("/").filter(Boolean)[0] ?? "";
  const possibleStoreSlug = storeSubdomainSlug ?? firstPathSegment;
  if (
    possibleStoreSlug &&
    isValidStoreSlug(possibleStoreSlug) &&
    !isReservedStoreSubdomain(possibleStoreSlug) &&
    !(await storeSlugExists(possibleStoreSlug))
  ) {
    if (nativeStoreSubdomainSlug) {
      return createMarketplaceHomeRedirect(request);
    }

    return createNotFoundResponse();
  }
  if (
    !storeSubdomainSlug &&
    firstPathSegment &&
    isValidStoreSlug(firstPathSegment) &&
    !isReservedStoreSubdomain(firstPathSegment) &&
    await storeSlugExists(firstPathSegment)
  ) {
    const storePrefix = `/${firstPathSegment}`;
    const isSupportedStorefrontPath =
      visiblePathname === storePrefix ||
      visiblePathname === `${storePrefix}/products` ||
      visiblePathname === `${storePrefix}/contact` ||
      visiblePathname === `${storePrefix}/cart` ||
      visiblePathname.startsWith(`${storePrefix}/products/`);

    if (!isSupportedStorefrontPath) {
      return createMarketplaceHomeRedirect(request);
    }
  }
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
    visiblePathname,
    customDomainStoreSlug,
  );

  if (!needsSessionCheck(effectivePathname)) {
    return rewriteResponse;
  }

  return mergeSessionIntoRewrite(request, rewriteResponse);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|favicon.ico|.*\\..*).*)"],
};
