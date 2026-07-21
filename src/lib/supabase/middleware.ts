import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getDashboardPath, getLoginPath } from "@/lib/auth/redirects";
import type { AuthRole } from "@/lib/auth/types";
import { clientEnv } from "@/lib/config/env.client";
import { routing } from "@/i18n/routing";
import type { Database } from "@/types/database";

const authRoutes = ["/login", "/register"];
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
    prefix: "/admin",
    roles: ["admin"],
  },
  {
    prefix: "/store/dashboard",
    roles: ["seller"],
  },
  {
    prefix: "/dashboard",
    roles: ["customer"],
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
  return `/${locale}${path === "/" ? "" : path}`;
}

function getMetadataRole(role: unknown): AuthRole {
  if (role === "admin") {
    return "admin";
  }

  return "seller";
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    clientEnv.supabaseUrl,
    clientEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
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
  const route = protectedRoutes.find((item) => matchesPath(pathname, item.prefix));
  const localizedRoute = protectedRoutes.find((item) =>
    matchesPath(localizedPathname, item.prefix),
  );

  if (!user) {
    if (route || localizedRoute) {
      return createRedirectResponse(
        request,
        response,
        getLocalizedPath(
          locale,
          getLoginPath(`${pathname}${request.nextUrl.search}`),
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

  const role = profile?.role ?? getMetadataRole(user.user_metadata?.role);

  if (
    authRoutes.some(
      (path) => matchesPath(pathname, path) || matchesPath(localizedPathname, path),
    )
  ) {
    return createRedirectResponse(
      request,
      response,
      getLocalizedPath(locale, getDashboardPath(role)),
    );
  }

  if (localizedRoute && !localizedRoute.roles.includes(role)) {
    return createRedirectResponse(
      request,
      response,
      getLocalizedPath(locale, getDashboardPath(role)),
    );
  }

  return response;
}
