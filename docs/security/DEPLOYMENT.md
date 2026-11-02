# Təhlükəsizlik rollout və rollback

2 noyabr 2026-da root operator ilə guarded production rollout tamamlandı;
[cari deployment hesabatı](PRODUCTION_DEPLOYMENT_20261102.md) əsas mənbədir. Bu
branch avtomatik CI deployment etmir. Aşağıdakı checklist gələcək kontrollu
rollout/rollback üçün saxlanılır. Yeni rate limiter production-da yalnız Redis
və ya atomik PostgreSQL RPC istifadə edir; memory fallback yoxdur. Redis outage
zamanı PostgreSQL-ə keçmir: təzə counter ilə limit bypass etməmək üçün 503 verir.

## Deployment-dən əvvəl

1. Staging-də production-a uyğun env, GoTrue və PostgreSQL schema hazırlayın. Real istifadəçi datası/tokenlərini test fixture-ə köçürməyin. Məxfi fayllar 0600; service_role frontend/build arguments-ə verilməməlidir.
2. Root operator `deploy/security/audit-readonly.sql` ilə **current** database/cədvəl/policy/definer grant inventarını çıxarsın. Bu audit yalnız catalog oxuyur. Əvvəlki tətbiq ayrıca Supabase Cloud layihəsindən fərqlidir: bu patch-in bazası `api.alisveris.az` self-hosted backend-dir. Cloud `fxfycfkwodywmnzgkyvl`-i miqrasiya etməyin.
3. Recovery ehtiyatını yoxlayın: database logical backup + storage obyektləri + private env, serverdən kənar və şifrəli. Backup bərpasını staging-də sınayın. Bu branch backup yaratmayıb və silməyib. Disk 54% idi; ölçü/retention mövcud log siyasətinə uyğun planlaşdırılmalıdır.
4. Root operator təsdiqlənmiş DB container və DB adını müəyyən etsin. Parametrləri şifrə/token yazmadan private local env və Docker stdin ilə ötürün. Bu branch SQL-i **bu ardıcıllıqla, ON_ERROR_STOP ilə** staging-də, sonra production change window-da tətbiq edin:
   - `20261102090000_atomic_security_limits.sql`
   - `20261102093000_profile_security_columns.sql`
   - `20261102100000_admin_mfa_gate.sql` (flag default OFF)
   Məsələn: `docker exec -i <VERIFIED_POSTGRES_CONTAINER> psql -X -v ON_ERROR_STOP=1 -U postgres -d <VERIFIED_CURRENT_DATABASE> < migration.sql`. Placeholder-ləri yoxlamadan bu əmri çalışdırmayın. Production DB-ni sıfırlamaq/replay etmək olmaz.
5. Mövcud Redis loopback-dədir və tətbiq env-də konfiqurasiya olunub. Təhlükəsizlik counter-ləri `security:v1:` prefiksindən istifadə edir; `FLUSHALL`/`FLUSHDB` etməyin. Redis persistence/auth/ACL/maxmemory siyasəti root tərəfindən yoxlanmalıdır. Eviction olmadan tutum planlaşdırın; rate-limit store üçün cache ilə shared eviction siyasəti bypass yarada bilər. PostgreSQL fallback yalnız Redis URL-i **ümumiyyətlə verilməyibsə** seçilir.
6. `deploy/security/fetch-cloudflare-cidrs.py` yalnız config fragmentini stdout-a çıxarır. Review edin, sonra Cloudflare real-IP və `X-Real-IP` overwrite qaydalarını mövcud Nginx-ə merge edin. Source CIDR-ləri yoxlamadan CF header-inə etibar etməyin. `nginx -t`, sonra graceful reload; ayrı açıq SSH/provider console saxlayın. Tətbiq portu 3004 loopback-only qalmalıdır.
7. Env (aşağıda) və native GoTrue ayarlarını uyğunlaşdırın. `NODE_ENV=production node --env-file=app.env scripts/security/preflight.mjs` yalnız ad/status yoxlayır, secret çıxarmır. App rollout-dan əvvəl keçməlidir. Framework public env üçün ayrıca PUBLIC build env istifadə edin.
8. Auth native CAPTCHA aktivləşdirilirsə `AUTH_CAPTCHA_MODE=supabase`: login/signup/reset tokenini GoTrue bir dəfə doğrulayır. `application` rejimi yalnız tətbiq formalarını qoruyur; direct `/auth/v1/*` bypass açıq qalır. GoTrue: CAPTCHA provider/secret və origin allowlist, signup/email confirmation (`GOTRUE_MAILER_AUTOCONFIRM=false`), refresh/token rate-ləri ayrıca operator tərəfindən doğrulanmalıdır. Mövcud SMTP və recovery template parametrləri qorunur. Confirmation template TokenHash signup handler-ə yönəldir. Yeni flow mövcud hesabların verification statusunu geriyə dəyişmir.
9. App-ni yeni release kimi qurun; əvvəlki release/private PM2 config qorunsun. Staging smoke: anonymous catalogue, approved buyer/seller login, register/confirmation, reset/same-password, cart/checkout idempotency, upload, admin role denial, mail CTA. Real order/mail/customer üzərində avtomatik sınaq yoxdur.
10. CSP namizəd siyasət **Report-Only**-dir; mövcud enforced CSP saxlanır. Report endpoint URL/sample log etmir. Inline Next hydration, theme bootstrap, Turnstile, Cloudflare analytics, RAdmin srcdoc preview, xəritə və OAuth üçün report-ları staging-də yoxlayın. Nonce/hashes/static caching planı tamamlanmadan strict script siyasətini enforce etməyin. HSTS preload/includeSubDomains avtomatik əlavə edilmir; əvvəlcədən cache edilmiş köhnə wildcard HSTS dərhal geri çəkilə bilməz.

## MFA rollout — mövcud adminləri bloklamadan

- Əvvəl env `ADMIN_MFA_POLICY=off`, DB `security_configuration.admin_mfa_required=false` ilə deploy.
- Hər admin normal giriş edib `/radmin/mfa` səhifəsində TOTP enroll + verify etsin. Kod, QR, secret screenshot/log/shared docs-a düşməsin. Başqa factor varsa yenisini əlavə etmək AAL2 tələb edir.
- Operator emergency provider/root yolu və ən az iki idarə olunan administratorun bərpa prosesini yoxlasın. MFA itkisini avtomatik faktor silməklə həll etməyin.
- Env `ADMIN_MFA_POLICY=enrolled` — artıq faktor qoşulmuş adminlərin aal1 sessiyası challenge-ə gedir; faktorsuz mövcud hesablar dərhal bağlanmır.
- Bütün adminlər hazır olduqdan sonra eyni change window-da env `required` və DB `update public.security_configuration set admin_mfa_required=true where id=true;` aktivləşdirin. **Hər iki qat lazımdır**: service-role istifadə edən action-lar application gate-ə əsaslanır, JWT/RLS və is_admin RPC-ləri DB gate-ə. Yalnız bir qat aktivdirsə tam MFA enforcement kimi təqdim etməyin.
- AAL1 admin yalnız öz basic profilini challenge üçün oxuya bilir; AAL2 normal admin icazələrini bərpa edir. Heç bir mövcud faktor silinmir.

## Env adları (dəyərləri Git-ə daxil etməyin)

| Ad | Məqsəd |
|---|---|
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL` | canonical HTTPS originlər, credentials olmayan URL |
| `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | server-only existing DB access |
| `SECURITY_REDIS_URL` və ya mövcud `REDIS_URL` | distributed counter; private URL, Redis ACL/persistence review |
| `TRUSTED_PROXY_MODE=nginx` | yalnız trusted overwrite və loopback yoxlanıldıqdan sonra X-Real-IP-ni qəbul edir |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | birlikdə qurulmalı widget açarları |
| `TURNSTILE_ALLOWED_HOSTNAMES` | vergüllə ayrılmış **dəqiq** production/staging/store hostname-ləri; hazırda wildcard qəbul edilmir |
| `AUTH_CAPTCHA_MODE=application\|supabase` | native GoTrue CAPTCHA ilə uyğun rejim; token iki dəfə redeem olunmur |
| `AUTH_REQUIRE_EMAIL_VERIFICATION=true` | default true; false yalnız əvvəlki qeydiyyat axınına kontrollu rollback üçündür; GoTrue confirmation da aktiv olmalıdır |
| `ADMIN_MFA_POLICY=off\|enrolled\|required` | mərhələli rollout; default off |
| `HSTS_INCLUDE_SUBDOMAINS=1` | yalnız bütün subdomain TLS yoxlamasından sonra opt-in |

## Rollback

App: private əvvəlki PM2 config/release-i bərpa edin; `app.env` secret-lərini output-a çıxarmayın. Database: yeni counter cədvəli/func-ları və OFF MFA flag-i köhnə app-ə mane olmur, onları kor-koranə drop etməyin. MFA insidentində root əvvəl DB flag-i false, env policy-ni off edib əvvəlki app-ni bərpa etsin; bu, qorumanın müvəqqəti azalmasıdır, audit və incident qərarı ilə edilməlidir. Yeni profile-column guard normal profil dəyişikliklərinə mane olmamalıdır; unexpected legitimate failure olarsa yalnız `security_guard_profile_write` triggerini root disable edib səbəbi araşdırın. Core RLS-i və bütün triggerləri söndürməyin. Counter cleanup: service role ilə `security_prune_rates()` saatlıq, Redis TTL avtomatik; tətbiq datasına toxunmur.

Nginx: əvvəlki **private** config snapshot-u bərpa et, `nginx -t`, graceful reload. Firewall: əvvəl provider console və SSH/22 allow qaydası; yalnız yeni qaydaları rollback et, `ufw reset` etmə. Faktiki aktivləşdirilmiş tədbirlər və xarici sistemdə qalan sazlamalar production hesabatında ayrılıb.
