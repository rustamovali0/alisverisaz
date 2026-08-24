"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";

import { routing, type Locale } from "@/i18n/routing";
import { getSharedCookieDomain } from "@/lib/config/domains";

const localeCookieName = "NEXT_LOCALE";
const localeCookieMaxAge = 60 * 60 * 24 * 365;

export async function setUserLocale(locale: string): Promise<Locale> {
  const safeLocale = routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale;
  const host = (await headers()).get("host");
  const domain = getSharedCookieDomain(host);

  (await cookies()).set(localeCookieName, safeLocale, {
    path: "/",
    sameSite: "lax",
    maxAge: localeCookieMaxAge,
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
  });

  return safeLocale;
}
