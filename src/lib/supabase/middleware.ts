import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getAdminLoginPath, getDashboardPath, getLoginPath } from "@/lib/auth/redirects";
import type { AuthRole } from "@/lib/auth/types";
import { clientEnv } from "@/lib/config/env.client";
import { getSharedCookieDomain } from "@/lib/config/domains";
import { getSupabaseCookieName, resolveAuthScopeFromPath } from "@/lib/supabase/auth-scope";
import { routing } from "@/i18n/routing";
import type { Database } from "@/types/database";

const authRoutes = ["/login", "/radmin/login"];
type CookiesToSet = Array<{
  name: string;
  value: string;
  options: CookieOptions;
}>;

const protectedRoutes: Array<{
  prefix: string;
  roles: AuthRole[];
}> = [
  {
    prefix: "/radmin",
    roles: ["admin"],
  },
  {
    prefix: "/admin",
    roles: ["seller"],
  },
  {
    prefix: "/store/dashboard",
    roles: ["seller"],
  },
  {
    prefix: "/dashboard",
    roles: ["customer", "seller"],
  },
];

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function createRedirectResponse(request: NextRequest, response: NextResponse, path: string) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });

  return redirectResponse;
}

function getLocalizedPath(locale: string, path: string) {
  if (locale === routing.defaultLocale) {
    return path;
  }

  return `/${locale}${path === "/" ? "" : path}`;
}

export async function updateSession(
  request: NextRequest,
  initialResponse?: NextResponse,
) {
  let response =
    initialResponse ??
    NextResponse.next({
      request,
    });

  const supabase = createServerClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabasePublishableKey,
    {
      ...(getSupabaseCookieName(resolveAuthScopeFromPath(request.nextUrl.pathname))
        ? {
            cookieOptions: {
              name: getSupabaseCookieName(resolveAuthScopeFromPath(request.nextUrl.pathname)),
            },
          }
        : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          const sharedDomain = getSharedCookieDomain(request.headers.get("host"));
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              ...(sharedDomain ? { domain: sharedDomain } : {}),
            });
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/");
  const locale = routing.locales.includes(segments[1] as any)
    ? segments[1]
    : routing.defaultLocale;
  const localizedPathname =
    segments[1] === locale
      ? `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/"
      : pathname;
  const isAdminLogin =
    matchesPath(pathname, "/radmin/login") ||
    matchesPath(localizedPathname, "/radmin/login");
  const route = isAdminLogin
    ? undefined
    : protectedRoutes.find((item) => matchesPath(pathname, item.prefix));
  const localizedRoute = isAdminLogin
    ? undefined
    : protectedRoutes.find((item) => matchesPath(localizedPathname, item.prefix));

  if (!user) {
    if (route || localizedRoute) {
      return createRedirectResponse(
        request,
        response,
        getLocalizedPath(
          locale,
          (route ?? localizedRoute)?.roles.includes("admin")
            ? getAdminLoginPath(`${pathname}${request.nextUrl.search}`)
            : getLoginPath(`${pathname}${request.nextUrl.search}`),
        ),
      );
    }

    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .returns<{ role: AuthRole }[]>()
    .maybeSingle();

  const role: AuthRole = profile?.role ?? "customer";

  const matchedAuthRoute = authRoutes.find(
    (path) => pathname === path || localizedPathname === path,
  );

  if (matchedAuthRoute) {
    if (matchedAuthRoute === "/login" && role === "admin") {
      return response;
    }

    if (matchedAuthRoute === "/radmin/login") {
      return role === "admin"
        ? createRedirectResponse(
            request,
            response,
            getLocalizedPath(locale, getDashboardPath(role)),
          )
        : response;
    }

    return createRedirectResponse(
      request,
      response,
      getLocalizedPath(locale, getDashboardPath(role)),
    );
  }

  if (localizedRoute && !localizedRoute.roles.includes(role)) {
    if (localizedRoute.roles.includes("admin")) {
      return createRedirectResponse(
        request,
        response,
        getLocalizedPath(locale, getAdminLoginPath(`${pathname}${request.nextUrl.search}`)),
      );
    }

    if (role === "admin" && !localizedRoute.roles.includes("admin")) {
      return createRedirectResponse(
        request,
        response,
        getLocalizedPath(locale, getDashboardPath(role)),
      );
    }

    return createRedirectResponse(
      request,
      response,
      getLocalizedPath(locale, getDashboardPath(role)),
    );
  }

  return response;
}
