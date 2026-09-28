# Security and regression audit

## Scope

Source review of authentication, seller/product/order actions, API routes, uploads,
and selected database migrations. Automated tests use isolated Supabase and email
adapters; no real accounts, products, orders, or credentials are changed by tests.
This is not a certification that the whole application is vulnerability-free.

## Fixes

- Upgrade Next.js, Sharp/native Linux packages, Nodemailer, Browserslist and
  baseline-browser-mapping. Initial npm audit: 5 vulnerable packages
  (1 critical, 3 high, 1 moderate); final audit: 0 known advisories.
- Remove the unauthenticated product-submission notification helper from the
  client-callable Server Action surface; keep it in a server-only module.
- Reject external/backslash/control-character redirect destinations in login,
  OAuth, recovery and authenticated auth-page redirects.
- Build email recovery links from trusted application configuration, not Host
  or forwarding headers. Return a generic response before deferred account lookup
  and email delivery, to avoid account disclosure by content or delivery latency.
- Rate-limit registration and password recovery; fail closed on limiter read/write
  errors. On Vercel, ignore spoofable third-party proxy IP headers.
- Do not bypass configured public-login CAPTCHA by omitting the token.
- Preserve refreshed cookie domain, expiry and security attributes across rewrites
  and redirects. Respect the separate admin session for shared admin/seller actions.
- Fail closed on profile/revocation and seller-feature lookup errors; require
  product review when approval-policy loading fails.
- Ignore malformed R2 deletion URLs and remove query/fragment from object keys.
- Set anti-framing, MIME-sniffing, object/base and referrer security headers.
- Stabilize initial auth-hook state for delayed hydration; preserve cached display
  data during retryable auth network failures. Server guards still authorize actions.
- Move the reusable store-page renderer out of the Next route module, fixing the
  invalid page export caught by the production build.

## Verification

- 95 regression cases across 11 test files: redirects, auth/session/roles,
  cross-seller product and order writes, upload validation and raster conversion,
  API bounds, webhook rejection, cookie propagation, feature policies and hydration.
- TypeScript check and production build, including 733 generated pages.
- Local Turbopack cannot bind its internal worker port in this environment;
  the local build is validated with `npm run build -- --webpack`. The GitHub
  workflow runs the normal production build on Linux.
- `npm run qa:smoke -- https://www.alisveris.az` performs read-only public-page,
  anonymous access-boundary and rejected-request checks; results go to
  `outputs/security-smoke.json` (ignored by Git).

## Remaining validation and risks

- No isolated Supabase database/service-role configuration was available locally.
  Live RLS, applied migration state, real email/OAuth delivery and concurrent
  checkout/stock/promo behavior need staging integration tests with disposable users.
- The existing rate-limit table uses read/modify/write, not an atomic database
  increment. Concurrency/load resistance still needs a transactional limiter and
  deployment of the corresponding database change; no load test was run on production.
- Registration still auto-confirms email, as in the existing product flow. A verified
  email ownership flow requires a coordinated signup/UI/SMTP change.
- A complete script-source CSP, authenticated multi-tenant storage/RLS mutation
  testing, dependency exploitability analysis and independent penetration testing
  are outside the evidence supplied by these checks.

## Advisory sources

- https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4
- https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c
- https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
