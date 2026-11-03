# RAdmin refresh and application injection hardening — 2026-11-03

## Scope and findings

This release changes the RAdmin presentation and validates browser destinations. It does not migrate the database or change Auth, Cloudflare, DNS, firewall, SSH, payment configuration, user accounts, orders or email delivery.

| Finding | Severity / scope | Resolution |
| --- | --- | --- |
| CMS menu and homepage-button destinations accepted arbitrary protocols. Social-profile URL normalization was duplicated and permissive. | Medium defense-in-depth: stored links controlled by an administrator or store owner; script execution was not demonstrated. React 19 already rejects `javascript:` in supported render paths. | **IMPLEMENTED, TESTED:** shared protocol allowlist, relative-path validation, contact-scheme opt-in, control-character/userinfo rejection; checks at server writes and public read/render boundaries. Existing invalid links cannot become active destinations. |
| Admin activity search interpolated unquoted PostgREST values and discarded Azerbaijani letters; `_` remained a LIKE wildcard. | Low: incorrect/broad matches in an already privileged search; no arbitrary SQL execution demonstrated. | **IMPLEMENTED, TESTED:** bounded Unicode-preserving input, quoted PostgREST values, escaped SQL LIKE `%`, `_` and backslashes. |
| Telegram store/category name lookups treated `%` and `_` as wildcards. | Low: ambiguous target selection in an authorized administrative workflow; not SQL injection. | **IMPLEMENTED, TESTED:** escape the LIKE pattern passed through the parameterized Supabase query. |
| Dense navigation, repeated metrics and user labels, decorative nested panels. | Usability | **IMPLEMENTED:** grouped navigation with section search, compact sidebar, neutral scoped styles, single set of linked metrics, mobile drawer, keyboard escape/focus containment and theme support. |

No confirmed path to arbitrary SQL execution was found in the reviewed query builders. Parameterized Supabase/PostgREST calls and existing RLS protections remain in place. Do not interpret this review or passing tests as a guarantee of zero penetration-test findings.

## Files and safeguards

- `src/lib/security/urls.ts`: one browser-link policy. Not an SSRF allowlist; server-fetch protections remain separate.
- `src/lib/cms/actions.ts`, `src/lib/cms/data.ts`: validate new menu/banner links and safely render previously stored links.
- `src/lib/store-settings/actions.ts`, storefront/footer/location components, JSON-LD: reject malformed social destinations while retaining handles, HTTP(S) links and phone formats. Structured-data script-delimiter escaping remains intact.
- `src/lib/security/postgrest.ts`, `src/lib/activity/data.ts`, `src/lib/telegram/admin-bot.ts`: literal pattern handling. SQL parameter binding remains unchanged.
- `src/components/radmin/radmin-dashboard-shell.tsx`, `src/lib/dashboard/radmin-navigation.ts`, `src/app/radmin.css`, admin layout/overview: presentation and navigation only. All destination links, server authorization, Danger confirmation, MFA, logout and theme features remain available.

All new CSS is scoped under `.radmin-shell`. Public storefront layout is unchanged. `/radmin/panel` remains the overview; hidden admin aliases retain the homepage redirect.

## Validation

- **TESTED:** native Vitest suite, including bound PostgreSQL/PGlite pattern tests, URL payloads, server-action rejection before writes/uploads, administrator authorization, Unicode activity searches, navigation completeness and rewrite hydration consistency.
- **TESTED:** TypeScript and production standalone build.
- **TESTED:** tracked-source secret scan. No private environment files enter the deployment archive.
- **CONFIGURATION REQUIRED:** visual browser interaction could not initially be performed because local browser access was disabled in Work settings. Server-rendered navigation tests are not a replacement for interactive responsive/accessibility verification.
- Existing tests also cover RLS/tenant isolation, CSRF, CAPTCHA, distributed rate limits, uploads, SSRF boundaries and structured-data escaping. No attack payloads or aggressive scans are sent to production.

Execution evidence before production activation:

- 584 tests / 83 files passed on Node 22; TypeScript and final Next standalone build passed.
- Staging verification passed at 2026-11-03 15:24 Baku: 27 normal marketplace checks plus 9 grouped security scenarios (10 recorded groups total). Actual Redis Lua/CAS, token replay denial, cross-origin rejection, custom-domain return, expiry, automatic detector thresholds and SSH recovery were exercised only in isolated staging storage.
- Reviewed archive SHA-256: `1de7ad4905f67e4a3ae2dfe2c3af2f4126ad5eae0420227586320be9c95e15a0`.
- **IMPLEMENTED, TESTED — deployed:** 2026-11-03 15:28:19 Baku, source commit `9e1ec28f6e3aee98f75520f5df6ce6241f84fe7a`, PM2 PID `2874258`, release `/srv/alisveris/releases/radmin-refresh-20261103/app`.
- 27 native live smoke checks and 27 checks through `https://alisveris.az` passed. Public headers report Cloudflare, CSP and `nosniff`; Auth health is HTTP 200. No production attack scans were run.
- Manual Danger stayed off; automatic risk monitoring was already on immediately before deployment and remained on afterward. The production security Redis PID `2739017` and RTest PID `211116` stayed unchanged; the new main process had zero restarts at verification.
- 24 Python operations tests and 8 backup/receipt fixture tests passed locally without creating or restoring a production backup.
- [GitHub source verification run 135](https://github.com/rustamovali0/alisverisaz/actions/runs/41627452596) completed successfully. [Draft PR #12](https://github.com/rustamovali0/alisverisaz/pull/12) contains the reviewed changes.
- Disposable staging Redis/configuration and the SHA-verified uploaded archive were removed. Rollback remains; disk is 48% used with about 15 GiB free.
- Interactive visual testing remains **BLOCKED** by the browser tool response `Local browser use is disabled in Work settings`, despite the user's screenshot showing the Browser preference enabled. No alternative browser route was used to bypass that access control.

## Remaining limitations

- Dependency audit still reports eight moderate dependency-tree entries for the one existing minimatch advisory [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). The existing exact-advisory exception expires 2026-12-02; it is not a fix. The patched major version changes the API consumed by legacy CommonJS glob/ExcelJS dependencies, so it was not forced into production. No high or critical dependency findings were returned in this audit.
- CSP report-only policy, Cloudflare plan-specific WAF/origin controls and staged administrator MFA follow the prior security deployment. This release does not claim to activate external controls or enable Danger automatically.
- This is a targeted code review and regression pass, not an independent comprehensive red-team assessment or a load-capacity certification.

## Deployment and rollback

1. Package the final Next standalone server, static assets, public assets and reviewed deployment helpers; exclude secrets.
2. Verify the archive SHA-256 before extraction. Refuse activation if the production app/PID differs from the reviewed predecessor.
3. Run the temporary application on loopback 3104 and use isolated security Redis 16380. Production Redis 16379 is never reset or used for destructive fixtures.
4. After staging passes, switch only PM2 `alisveris-vds` to `/srv/alisveris/releases/radmin-refresh-20261103/app`. The helper automatically restores the previous PM2 configuration on readiness/smoke failure.
5. Run ordinary read-only production smoke checks and inspect Auth health and Danger status. Keep manual and automatic Danger modes unchanged.
6. Retire only the owned temporary staging Redis/configuration after PID/UID/cwd/port checks. Keep the immediate rollback `/srv/alisveris/releases/danger-admin-final-20261103/app`, private rollback config and all existing database backups.

Manual rollback, if necessary: stop the new main PM2 app, start the private `rollback.config.cjs` in the new release root with `--only alisveris-vds`, verify loopback 3004 and ordinary public pages, then `pm2 save`. No database rollback is needed because no database migration is part of this release.

Reference: [PostgREST URL grammar](https://docs.postgrest.org/en/stable/references/api/url_grammar.html), [OWASP XSS prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
