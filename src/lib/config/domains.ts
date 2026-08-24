import { clientEnv } from "@/lib/config/env.client";

export const RESERVED_STORE_SUBDOMAINS = [
  "www",
  "api",
  "admin",
  "radmin",
  "auth",
  "login",
  "app",
  "dashboard",
  "seller",
  "store",
  "mail",
  "smtp",
  "cdn",
  "images",
  "static",
  "assets",
  "support",
  "help",
  "status",
  "checkout",
  "cart",
  "account",
  "payments",
  "products",
  "register",
  "privacy",
  "terms",
  "about",
  "contact",
  "faq",
  "guide",
  "rules",
] as const;

const RESERVED_STORE_SUBDOMAIN_SET = new Set<string>(RESERVED_STORE_SUBDOMAINS);
const DEFAULT_STORE_ROOT_DOMAIN = "alisveris.az";

function readHostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function normalizeHostname(hostname: string | null | undefined) {
  const value = (hostname ?? "").trim().toLowerCase();
  const withoutProtocol = value.replace(/^https?:\/\//, "");
  const host = withoutProtocol.split("/")[0]?.split(":")[0] ?? "";

  return host.replace(/\.$/, "");
}

export function getStoreRootDomain() {
  const explicitDomain = normalizeHostname(clientEnv.storeRootDomain);
  const appUrlDomain = normalizeHostname(readHostnameFromUrl(clientEnv.appUrl));

  if (explicitDomain) {
    return explicitDomain;
  }

  if (appUrlDomain && !appUrlDomain.endsWith(".vercel.app") && appUrlDomain !== "localhost") {
    return appUrlDomain;
  }

  return DEFAULT_STORE_ROOT_DOMAIN;
}

export function isReservedStoreSubdomain(slug: string) {
  return RESERVED_STORE_SUBDOMAIN_SET.has(slug.trim().toLowerCase());
}

export function isValidStoreSlug(slug: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/.test(slug);
}

export function getStoreSubdomainSlug(hostname: string | null | undefined) {
  const host = normalizeHostname(hostname);
  const rootDomain = getStoreRootDomain();

  if (!host || !rootDomain || host === rootDomain || host === `www.${rootDomain}`) {
    return null;
  }

  if (host.endsWith(".vercel.app") || !host.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const slug = host.slice(0, -(rootDomain.length + 1));

  if (!slug || slug.includes(".") || isReservedStoreSubdomain(slug) || !isValidStoreSlug(slug)) {
    return null;
  }

  return slug;
}

export function getStorefrontUrl(storeSlug: string, path = "") {
  const safeSlug = storeSlug.trim().toLowerCase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!isValidStoreSlug(safeSlug) || isReservedStoreSubdomain(safeSlug)) {
    return `${clientEnv.appUrl}${normalizedPath === "/" ? "" : normalizedPath}`;
  }

  return `https://${safeSlug}.${getStoreRootDomain()}${
    normalizedPath === "/" ? "" : normalizedPath
  }`;
}

export function getSharedCookieDomain(hostname: string | null | undefined) {
  const host = normalizeHostname(hostname);
  const rootDomain = getStoreRootDomain();

  if (host === rootDomain || host === `www.${rootDomain}` || host.endsWith(`.${rootDomain}`)) {
    return `.${rootDomain}`;
  }

  return undefined;
}
