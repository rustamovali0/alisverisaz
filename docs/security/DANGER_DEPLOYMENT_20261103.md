# Danger deployment — 2026-11-03

## Latest follow-up — password confirmation and panel entry

- Current application source **`ede72b7afdaa134f9ae0cfddc9218ca9dd1ffb55`**; release **`/srv/alisveris/releases/danger-admin-final-20261103/app`**, PM2 PID **2852280**, online/zero restarts. Cutover: **2026-11-03 08:10:47 UTC / 12:10:47 Asia/Baku**. Immediate rollback: `/srv/alisveris/releases/danger-password-20261103/app`.
- The current dashboard entry is **`/radmin/panel`**. Bare `/radmin` and legacy `/administrator/...` return a direct homepage redirect without a 404 notice. Authenticated dashboard navigation was verified in the user's existing browser session; anonymous access still redirects to admin login. Existing admin subsection paths are retained.
- At the user's explicit request, Danger-specific AAL2 confirmation was replaced with verification of the **existing RAdmin login password** on every manual/automatic setting change. No new PIN was created. Native Turnstile, authenticated admin role checks, shared attempt limits and audit events remain. Global MFA policy/factors were not changed.
- A concurrent first-render Redis readiness race found in the real authenticated browser was fixed and regression-tested. The final release's first authenticated Danger load showed **no storage warning, no Authenticator-required prompt, and two password-type current-password fields**.
- **535 native tests passed**, production build/TypeScript passed, and the final code's [GitHub Actions run 133](https://github.com/rustamovali0/alisverisaz/actions/runs/41601016031) succeeded. Staging and production smoke each passed **27 ordinary checks**; automatic risk/ticket/CAS/CSRF/expiry/recovery staging checks also passed. Password-provider behavior uses fixtures; no real administrator password or CAPTCHA was submitted by the agent.
- Verified modes remain **OFF / automatic OFF**. Auth health returned 200; permanent Redis and RTest kept their original PIDs. Disposable staging was retired using PID/UID/cwd/port ownership checks. No business database, Auth settings, firewall, DNS or SSH changes were made.
- Final archive SHA-256: `aaddffdb8b3b77e7a26624b8349c2b7159e4e6553552426ad01b09a9d8777fc4`. Environment files were excluded. Emergency recovery and current password-confirmation behavior are documented in [DANGER_MODE.md](DANGER_MODE.md).

The sections below record the earlier manual/automatic rollout before these follow-up requests.

## Live state

- **IMPLEMENTED / TESTED**: manual Danger and opt-in automatic risk detection are deployed at `https://alisveris.az/radmin/danger`.
- Application source: `7c5b8a295a3e6dfac161271531a090dd55a27222` on `codex/danger-mode`; draft [PR #11](https://github.com/rustamovali0/alisverisaz/pull/11), based on the already deployed `codex/enterprise-security` branch. No merge was performed.
- Active application: `/srv/alisveris/releases/danger-auto-20261103/app`; PM2 `alisveris-vds`, PID **2844212**, port **3004**, online, zero restarts at post-deployment verification.
- Immediate application rollback: `/srv/alisveris/releases/danger-mode-20261103/app`, source `4050970a6798979e058a546b8f824ad41da5ab81`.
- Final cutover completed **2026-11-03 07:24:41 UTC** / **11:24:41 Asia/Baku**.
- Verified live state: **Danger OFF; automatic detector OFF**. Deployment did not enable a visitor-wide challenge. An AAL2 RAdmin must explicitly enable either control.
- Archive SHA-256: `d8338cf6d254964038261793438eab658a799662c47accb7ca8588a25b1cf126`. Archive excluded environment files. Existing signing secret was preserved; staging used separate signing/storage credentials.

## Verification

| Check | Result |
| --- | --- |
| GitHub Actions for application source `7c5b8a2` | **Success**, [run 130](https://github.com/rustamovali0/alisverisaz/actions/runs/41596053059) |
| Native regression tests on Node 22.23.4 | **516 passed**, 76 files |
| TypeScript / production standalone build | **Passed** |
| Python infrastructure tests | **24 passed** |
| Node infrastructure / crypto / gateway tests | **20 passed** |
| Tracked-source secret scan | No findings |
| Dependency audit | No High/Critical; unchanged existing Moderate exception documented by the audit script |
| Normal marketplace staging smoke | **25 checks passed** |
| Active-mode staging integration | Passed real Redis Lua, single-use entries, API/RSC denial, CSRF denial, custom-domain return, expiry and operator recovery |
| Automatic detector staging integration | Passed exact thresholds, stale-edit CAS rejection, fixed 15-minute activation, no extension, manual-off cooldown and operator disable of both modes |
| Production cutover smoke | **25 checks passed**, with automatic rollback available |
| Public HTTPS reads | Home, products, login/register, product/session APIs returned 200; anonymous RAdmin route redirected to login; inactive checkpoint redirected to the requested local page |
| Runtime services | Auth `/health` 200; permanent security Redis and RTest retained original PIDs / zero restarts |
| UI layout | New panels inspected in local static component preview; no horizontal overflow at 320px; primary buttons/selects 48px; light/dark views checked |

Earlier local Node 26 runs hit PostgreSQL-WASM fixture timeouts. The complete unchanged assertions passed on the production Node major, Node 22; no test assertion was removed or relaxed to obtain that result. A private-port redirect bug found during staging was fixed and regression-tested before either final cutover.

No production stress/brute-force scan was run. No real orders/accounts or email deliveries were created. A fresh real-user Turnstile challenge was not interactively solved during this deployment; provider response checks are unit-tested, while staging fixtures independently exercise signed entry/return behavior. Production RAdmin authorization was checked anonymously; authenticated AAL2 decisions are covered by tests rather than modifying a real administrator account.

## Preserved systems and limits

No business database schema/data, native Auth/CAPTCHA configuration, SMTP, payment logic, Nginx, firewall, SSH or DNS setting changed. The self-hosted backend and separate Supabase Cloud project were not migrated. The existing root database recovery backup was not modified.

Disposable staging apps, private staging environment files and Redis **16380** were retired only after deployment/ownership checks. The permanent security Redis **16379**, current app, immediate rollback and recovery files remain. Disk usage was **47%**, about **15 GiB free**, after verification. Existing automatic cleanup recognizes `previousRelease` in the active release marker and retains the immediate rollback.

**CONFIGURATION REQUIRED**: Cloudflare WAF/Under Attack/origin-firewall management remains separate; the panel does not claim to configure those without API access. The application detector observes auth abuse, not all attacks or server load, and gives no particular requests/second availability guarantee. Existing native GoTrue protection remains necessary for direct backend requests.

## Operator controls and rollback

Use **RAdmin → Danger → Avtomatik rejimi aç** to opt in. See [DANGER_MODE.md](DANGER_MODE.md) for thresholds, MFA, cooldown, server-only configuration and recovery.

Emergency operator disable (existing SSH session; no root required):

```sh
cd /srv/alisveris/releases/danger-auto-20261103/app
node --env-file=app.env deploy/security/danger-recover.mjs status
node --env-file=app.env deploy/security/danger-recover.mjs off
```

The `off` command disables both extra mode and automatic detection; baseline protection stays active. For an application regression, disable the mode first, then use the private `/srv/alisveris/releases/danger-auto-20261103/rollback.config.cjs` PM2 configuration as documented. No database restore is required.
