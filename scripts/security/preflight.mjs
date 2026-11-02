const errors = [];
const has = (k) => Boolean(process.env[k]?.trim());
if (process.env.NODE_ENV !== "production")
  errors.push("NODE_ENV must be production for deployment preflight");
for (const k of ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
  try {
    const u = new URL(process.env[k]);
    if (u.protocol !== "https:" || u.username || u.password)
      errors.push(k + " must use HTTPS without URL credentials");
  } catch {
    errors.push(k + " missing/invalid");
  }
}
if (process.env.TRUSTED_PROXY_MODE !== "nginx" && process.env.VERCEL !== "1")
  errors.push("Configure trusted ingress before enabling IP budgets");
if (!has("SUPABASE_SECRET_KEY") && !has("SUPABASE_SERVICE_ROLE_KEY"))
  errors.push("A server-only Supabase credential is required");
if (has("TURNSTILE_SECRET_KEY") !== has("NEXT_PUBLIC_TURNSTILE_SITE_KEY"))
  errors.push("Turnstile site/secret must be configured together");
if (has("TURNSTILE_SECRET_KEY") && !has("TURNSTILE_ALLOWED_HOSTNAMES"))
  errors.push("Review the exact Turnstile hostname allowlist");
if (!["application", "supabase"].includes(process.env.AUTH_CAPTCHA_MODE || ""))
  errors.push("Set AUTH_CAPTCHA_MODE after verifying GoTrue CAPTCHA settings");
if (
  !["off", "enrolled", "required"].includes(
    process.env.ADMIN_MFA_POLICY || "off",
  )
)
  errors.push("Invalid ADMIN_MFA_POLICY");
const redis = process.env.SECURITY_REDIS_URL || process.env.REDIS_URL;
if (redis) {
  try {
    const u = new URL(redis);
    if (!["redis:", "rediss:"].includes(u.protocol))
      errors.push("Invalid security Redis protocol");
  } catch {
    errors.push("Invalid security Redis URL");
  }
}
console.log(
  JSON.stringify(
    {
      ready: errors.length === 0,
      storage: redis ? "redis" : "postgresql-rpc (migration required)",
      errors,
      manualChecks: [
        "nginx overwrites X-Real-IP; application is loopback-only",
        "security migrations installed and tested in staging",
        "native GoTrue CAPTCHA mode matches AUTH_CAPTCHA_MODE",
        "new-account email confirmation enabled in GoTrue",
        "MFA environment and database switches agree; emergency access verified",
      ],
    },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
