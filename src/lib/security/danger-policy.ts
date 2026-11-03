export const DANGER_STATE_KEY = "security:danger:v1:state";
export type DangerState = { enabled: boolean; version: string; expiresAt: number; changedAt: number };
export const dangerOff: DangerState = { enabled: false, version: "off", expiresAt: 0, changedAt: 0 };
export function parseDangerState(raw: string | null, now = Date.now()): DangerState {
  if (!raw) return { ...dangerOff };
  const value = JSON.parse(raw);
  if (typeof value.enabled !== "boolean" || typeof value.version !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value.version) || !Number.isFinite(value.expiresAt) || !Number.isFinite(value.changedAt)) throw Error("Invalid security state");
  return { enabled: value.enabled && value.expiresAt > now, version: value.version, expiresAt: value.expiresAt, changedAt: value.changedAt };
}
export function dangerLimit(scope: string, normal: number) {
  if (scope === "login:ip") return Math.min(normal, 20);
  if (scope === "login:identifier") return Math.min(normal, 3);
  if (scope === "register:identifier") return Math.min(normal, 1);
  if (scope === "password_reset:identifier") return Math.min(normal, 2);
  if (/^(register|password_reset):ip$/.test(scope)) return Math.min(normal, 10);
  if (scope === "admin_mfa:ip") return Math.min(normal, 20);
  if (scope.startsWith("admin_mfa:")) return Math.min(normal, 5);
  if (/upload|import/.test(scope)) return Math.min(normal, 3);
  if (/search/.test(scope)) return Math.min(normal, 20);
  if (/products|related/.test(scope)) return Math.min(normal, 30);
  if (scope.startsWith("support_message:")) return Math.min(normal, 2);
  return normal;
}
export function safeDangerNext(value: unknown) {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid" || /^(?:\/(?:az|en|ru))?\/security-(?:check|return)(?:\/|$)/.test(url.pathname)) return "/";
  for (const key of [...url.searchParams.keys()]) if (/token|code|password|secret/i.test(key)) url.searchParams.delete(key);
  return url.pathname + url.search;
}
export function dangerExemptPath(path: string) {
  return ["/security-check", "/security-return", "/api/security/return", "/api/security/visit", "/api/security/turnstile-site-key", "/api/security/csp-report", "/api/telegram/webhook", "/auth/confirm", "/auth/callback", "/reset-password", "/logout", "/robots.txt", "/sitemap.xml", "/favicon.ico", "/favicon.png", "/icon.svg", "/icon.png", "/apple-icon.png", "/manifest.webmanifest"].includes(path)
    || ["/_next/", "/_vercel/", "/marketplace/", "/brand/", "/email-templates/", "/auth/"].some(prefix => path.startsWith(prefix));
}
