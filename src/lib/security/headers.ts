/** A stricter candidate is observed before enforcing nonces on cached pages. */
export function reportOnlyCsp(supabaseSources = "") {
  return [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseSources} https://challenges.cloudflare.com https://cloudflareinsights.com`,
    "frame-src 'self' https://challenges.cloudflare.com https://www.google.com https://maps.google.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "report-uri /api/security/csp-report",
  ].join("; ");
}
export function hstsValue() {
  return (
    "max-age=31536000" +
    (process.env.HSTS_INCLUDE_SUBDOMAINS === "1" ? "; includeSubDomains" : "")
  );
}
