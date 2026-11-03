# RAdmin Danger mode

## Operator use

Open the dashboard at **`/radmin/panel`**, then **Danger** (`/radmin/danger`). Choose **15 minutes, 1 hour or 6 hours**, confirm the notice and enter the existing RAdmin login password. The same page returns to normal mode. Every manual/automatic setting change requires an authenticated administrator and fresh server-side password verification. The Danger-specific Authenticator requirement was replaced at the user's explicit request; global MFA policy and existing factors remain unchanged. Mode changes have shared per-admin/IP budgets and audit entries. Bare `/radmin` and the legacy `/administrator/...` namespace redirect straight to the main homepage.

Mode is **OFF by default**. It affects all public storefronts while active and expires automatically; baseline protection remains after expiry. Do not leave it on as a substitute for edge DDoS protection.

## Implemented protection

- Redis holds one shared, versioned mode state. Atomic compare-and-set rejects stale edits from another admin session. State expires after at most 6 hours; the Redis record has a 24-hour TTL.
- A new full document navigation or refresh must pass the Cloudflare Turnstile checkpoint. After verification a 90-second, path-bound entry ticket admits that navigation exactly once. A short-lived host/IP/browser-bound clearance permits subsequent internal React/API navigation for at most one hour, bounded by mode expiry. Ordinary navigation is not forced through a challenge on every click.
- Turnstile tokens are verified server-side for the `danger_visit` action and expected allowed hostname; Cloudflare rejects expired or reused tokens. Entry/transfer tickets have separate purposes and Redis `SET NX` replay protection. Their HMAC signing secret is server-only. Cookies are HttpOnly, Secure in production, host-only, SameSite=Lax, and use `__Host-` names.
- Spoofing RSC or the internal danger header without clearance does not grant access. Product API responses behind clearance are private/no-store. Full-page checkpoint redirects and verification responses are not cached.
- Registered custom storefront domains use a signed intent to perform Turnstile on the main domain. Only successful verification issues a short-lived single-use return proof. The completed proof travels in a URL fragment, is immediately removed, is bound to the target host/browser, and is redeemed into that host's cookies. An intent alone cannot admit a visitor. Proofs grant bot clearance, never account privileges.
- Password reset confirmation, auth callbacks, assets, robots/sitemap and the independently authenticated Telegram webhook retain their existing handlers. Reset forms still enforce their own token/authorization rules. No user-agent based crawler bypass is added.
- Verification endpoints enforce same origin, bounded JSON, rate budgets and fail closed on shared storage failure. Shared storage outages can temporarily return 503 even when the last known mode was off; the server does not silently disable protection.

## Stricter request budgets

Existing limiter windows and IP normalization (/64 IPv6 buckets) are retained. The Redis Lua script clamps the original budget, never raises it. Counters already consumed in normal mode count immediately when Danger starts.

| Scope | Danger cap | Window |
| --- | --- | --- |
| Login by account identifier | 3 | existing 15 min |
| Login by IP | 20 | existing 15 min |
| Register by identifier / IP | 1 / 10 | existing 1 hour |
| Password reset by identifier / IP | 2 / 10 | existing 1 hour |
| Admin MFA by identifier / IP | 5 / 20 | existing MFA window |
| Upload and import | 3 | existing endpoint window |
| Search | 20 | existing endpoint window |
| Product / related APIs | 30 | existing endpoint window |
| Support messages | 2 | existing endpoint window |

Verification itself allows 60 requests/IP and 10/browser context per 5 minutes; bridge redemption allows 60/IP per 5 minutes. Baseline native GoTrue CAPTCHA and auth policies remain in place. No accounts are blocked or modified by the mode switch.

## Configuration boundary

Required: existing `SECURITY_REDIS_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, trusted loopback Nginx ingress, plus new random **`DANGER_SIGNING_SECRET` (at least 32 characters)**. The deployment helper generates it directly in private `app.env`; no secret is committed or printed.

No new database migration, Auth configuration, firewall or DNS change is required. No Cloudflare API credential is configured for this feature. Consequently this button **does not enable Cloudflare Under Attack mode, change WAF rules or protect a directly exposed origin**. Those require separate edge/origin configuration described in `../CLOUDFLARE_SECURITY_SETUP.md`. Turnstile can automatically solve a check without a manual checkbox. It is not a guarantee that a particular requests/second load cannot exhaust the server.

Provider references: [server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) and [hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).

## Testing and rollout

Unit/integration cases cover RAdmin/AAL2, CAS/expiry, MAC binding, single-use/replay denial, redirect sanitization, malformed/oversized requests, CSRF, rate responses and storage failure. `deploy/security/verify-danger-staging.mjs` refuses all storage except isolated loopback Redis **16380** and operates against staged app **3104**. Its signed fixtures are produced by the staging operator using a separate staging key; no test bypass exists in application code. No customers, orders or emails are created.

Application release: `/srv/alisveris/releases/danger-admin-final-20261103/app`.

1. Build standalone with public build configuration; package static/public assets and recovery/smoke scripts, excluding all environment files.
2. Verify archive SHA-256. `danger-release.mjs prepare <sha256>` requires the current production release, free staging ports and no existing destination; it copies the private environment and generates separate production/staging signing keys. Production Redis is never used for staging mode fixtures.
3. Run the staging verifier with the exact Lua scripts extracted from tested source. Inspect `stage-verification.json`.
4. `danger-release.mjs activate <source-commit>` checks readiness and the old production PID, writes a private PM2 rollback config, switches only the application, and runs the normal marketplace smoke suite. Failed checks return to the old app automatically. Database, Auth, Nginx and SSH remain untouched.
5. Verify ordinary HTTPS entry and that Danger remains OFF. Retire only the owned temporary app/Redis. Keep the immediate previous application for rollback.

If a staging check fails, inspect its output/state before repeating preparation. The release helper deliberately refuses duplicate preparation or activation.

## Recovery

An existing SSH operator can inspect or disable this mode without a public bypass or root:

```sh
cd /srv/alisveris/releases/danger-admin-final-20261103/app
node --env-file=app.env deploy/security/danger-recover.mjs status
node --env-file=app.env deploy/security/danger-recover.mjs off
```

Disabling invalidates outstanding tickets through a new state version and leaves all baseline controls active. No password/token is displayed. If Redis is unavailable, restore the existing security Redis service first.

For an application regression, first disable Danger, then use the private preserved PM2 config (contains runtime environment; never publish it):

```sh
pm2 delete alisveris-vds
pm2 start /srv/alisveris/releases/danger-admin-final-20261103/rollback.config.cjs --only alisveris-vds
pm2 save
```

Run the previous release's normal smoke script on port 3004. No database restore is needed because this rollout changes no schema or business data.

The standalone runtime uses private loopback ports behind Nginx. Redirect construction is regression-tested against an internal `127.0.0.1:3104` URL so that the private application port never leaks into the public HTTPS checkpoint URL. Staging's verifier uses native HTTP to preserve explicit virtual-host headers; it does not depend on Node fetch preserving `Host`.

## Automatic activation (opt-in)

The second control, **Risk zamanı avtomatik aktivləşmə**, enables a detector; it does not immediately enable Danger. It has its own versioned Redis configuration, current-password/confirmation requirement, 5/minute shared administrator control budget and audit event. The detector starts OFF. Its setting persists across application restarts.

Only server-observed failed login outcomes and HTTP 429 decisions in login/register/password-reset budgets feed it. Unknown networks, storage errors, successful logins, ordinary views and product/search traffic do not count. The trusted ingress normalizes IPv6 by /64. The detector hashes network identifiers and stores no email, password, token or raw IP.

The rolling five-minute thresholds are fixed:

- 30 failed logins across at least five distinct network buckets; or
- 60 auth-budget rejections across at least three distinct network buckets.

An atomic Redis Lua operation activates Danger for exactly 15 minutes and records the triggering reason. Requests cannot extend an already active period. A 30-minute cooldown starts at activation; manually returning to normal mode also starts a 30-minute cooldown. Explicitly re-enabling the detector resets its signal windows and cooldown. Turning the detector off stops future automatic activation and does not cancel an independently active Danger period.

Windows are bounded to 60 event IDs / 256 network hashes per signal type, expire after ten minutes, and are pruned by Redis server time. One last-trigger timestamp/reason is retained for seven days and shown in RAdmin. Automatic activations are written to the existing audit mechanism; there is no new email campaign or paid monitoring service. Failure to record a risk signal does not replace an auth error with a new error; existing auth limits/CAPTCHA remain enforced.

This is an application auth-abuse detector, not a volumetric DDoS detector, and does not observe traffic blocked at Cloudflare or direct calls to the separate GoTrue service. Existing native GoTrue CAPTCHA and abuse controls remain necessary. No detector can guarantee recognition of every attack.

The SSH `danger-recover.mjs off` command disables both Danger and the automatic detector, providing an operator escape path without a public bypass. The live release with automatic activation is `/srv/alisveris/releases/danger-password-20261103/app`; its immediate rollback is the previously verified manual-mode release `/srv/alisveris/releases/danger-mode-20261103/app`. The same application-only rollout process is used, with no database, Auth, firewall or DNS change.


## Password confirmation

The password field is shown for each manual and automatic mode operation. Credentials are checked only for the current server-verified administrator's email and user ID; submitted email/role/ID fields cannot select another account. A fresh non-persistent public Supabase client performs native password/CAPTCHA verification without writing the administrator's cookies. Its temporary session is revoked with `scope: "local"`; global sign-out is never used. Passwords, returned tokens and provider errors are not included in logs, audit metadata or action results. Client password/token fields clear after submission.

The existing Turnstile/GoTrue configuration remains enforced. Native Auth mode redeems the token once in GoTrue. An account has a five-attempt/15-minute verification budget, with a separate 20-attempt/IP budget and the existing 5/minute setting-change budget. Successful verification resets only the account's password-check counter. No shared static admin PIN or new credential is created. Auth requests have a five-second request timeout. This password step has lower assurance than an independent second factor; it implements the explicitly requested existing-password confirmation.

The final application release is `/srv/alisveris/releases/danger-admin-final-20261103/app`, with `/srv/alisveris/releases/danger-password-20261103/app` retained as immediate rollback. The shared Redis client awaits readiness (including AUTH/handshake), not just socket opening. A concurrent first-render regression test prevents a false unavailable-state warning when manual and automatic settings load together.
