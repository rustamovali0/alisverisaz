# Canlı təhlükəsizlik release-i — 2 noyabr 2026

**Deployment tamamlandı: 18:13:52 UTC / 22:13:52 Asia/Baku.** Root rollout
receipt-i `deployed`, tətbiq marker-i `deployed`-dir. Heç bir backup/DDL/switch
təkrar başladılmadı. Bu hesabat əvvəlki staging/pending status qeydlərini əvəz edir.

| Tədbir | Status və yoxlanmış nəticə |
|---|---|
| Native marketplace tətbiqi | **IMPLEMENTED / TESTED** — `/srv/alisveris/releases/enterprise-security-20261102/app`, `alisveris-vds`, port 3004, PID 2758166, 0 restart |
| Üç təhlükəsizlik migration-ı | **IMPLEMENTED / TESTED** — vahid transaction; root post-check bütün üç security object-in mövcudluğunu təsdiqləyib. Production restore/reset edilməyib |
| Native GoTrue | **IMPLEMENTED / TESTED** — yeni Auth container, eyni immutable image/database/JWT/SMTP parametrləri; loopback 9998 health 200. Native CAPTCHA disposable GoTrue-da yoxlanıb; canlıya eyni sazlama tətbiq edilib |
| Email-confirmed signup | **IMPLEMENTED / TESTED (configuration)** — canlı `/settings`: `disable_signup=false`, `mailer_autoconfirm=false`, email provider enabled. Real yeni hesab/məktub bu deployment-də yaradılmayıb |
| Distributed limiter | **IMPLEMENTED / TESTED** — ayrıca authenticated loopback Redis 16379, `noeviction`, AOF enabled, last write `ok`, PING `PONG`. Normal məhsul GET-i 200 qaytarıb və counter sayı dərhal 0-dan 1-ə keçib; production limit aşımı/brute-force sınağı edilməyib |
| Trusted ingress | **IMPLEMENTED / TESTED** — əsas marketplace Nginx config-də 22 rəsmi Cloudflare CIDR-i, X-Real-IP overwrite, visitor proxy-header təmizlənməsi və coarse auth/API/catalog limits. Nginx syntax check və graceful reload keçib |
| Security headers | **IMPLEMENTED / TESTED** — `nosniff`, `SAMEORIGIN`, Referrer-Policy `same-origin`, Permissions-Policy camera/microphone/geolocation disabled, HSTS domain-only 31536000s. Yeni CSP **Report-Only** saxlanılır |
| PM2 reboot persistence | **IMPLEMENTED / TESTED** — saved PM2 main cwd yeni release-dir, permanent Redis saved-dir, staging entry saved deyil. Faktiki reboot sınağı edilməyib |
| Staging retirement | **IMPLEMENTED / TESTED** — staging Node prosesi rollout-da silinib; ayrıca temporary Redis 16380 PID 2698419 owner/cwd/port guard-larından sonra graceful dayandırılıb, yalnız onun temporary config/log qalıqları silinib |
| RTest | **TESTED** — əvvəlki PID 211116, 0 restart, HTTP 200; RTest ingress/runtime dəyişdirilməyib |
| Backup və rollback | **IMPLEMENTED / TESTED** — cari database archive tam disposable restore-dan, GCM authentication və off-server plaintext ölçü/hash yoxlamasından keçib. Şifrəli nüsxə serverdə və Mac-də, şəxsi recovery key yalnız Mac-dədir. Əvvəlki app release/private PM2 rollback config və əvvəlki stopped Auth saxlanılır |
| Avtomatik release retention | **IMPLEMENTED / TESTED** — əvvəlki quraşdırma active; işlək release/runtime dependencies, birbaşa rollback və DB backup-lar qorunur. Bu post-deploy yoxlamada release cleanup yenidən çalışdırılmayıb |

Runtime tətbiq commit-i `f600819777f44805ebfec59c9c2a88be3b9ec5fe`-dir. Sonrakı
commit-lər ops/test/docs üçündür; `src`, `public`, package/lockfile və Next config
dəyişməyib. Buna görə yeni tətbiq build-i təkrar hazırlanmayıb. Kod və rollout
tarixçəsi [PR #10](https://github.com/rustamovali0/alisverisaz/pull/10)-dadır.

## Yoxlamaların əhatəsi

- **TESTED — 519 CI testi:** 465 native, 10 frontend, 12 gateway, 24 Python,
  8 Node crypto/recovery. GitHub Actions `41494717933`, source `e817e97`, success;
  build/typecheck/frontend lint/dependency audit/tracked secret scan keçib.
- **TESTED — 25 canlı read-only smoke:** native home/assets, catalog, pagination,
  VIP/filter, auth pages, protected-route login redirects; siyahıda 9 məhsul.
- **TESTED — 4 əlavə Cloudflare HTTPS GET:** `/`, məhsul API-si, `/login`,
  `/api/auth/session` hamısı 200, cache `DYNAMIC`, CSP Report-Only/nosniff/frame
  headers görünür. Sessiya endpoint-i `private, no-store` qaytarır.
- **TESTED — origin HEAD / Auth settings / Redis persistence:** ayrıca read-only
  yoxlanıb. Default Python user-agent ilə public HEAD 403 qaytarıb; eyni
  deployment verification GET-ləri 200 və origin HEAD 200-dür. Hansı edge
  qaydasının bunu yaratdığı müəyyən edilməyib, Cloudflare qaydası dəyişdirilməyib.
- Production-a stress, DDoS, brute-force, malformed upload, real order, real
  login/reset/signup və ya mail göndərişi sınağı aparılmayıb. Tam authenticated
  checkout/mail/MFA E2E bu smoke nəticələrinə daxil deyil.

## Qalan xarici sazlamalar

| Mövzu | Status |
|---|---|
| Admin MFA-nın məcburi edilməsi | **CONFIGURATION REQUIRED** — DB flag false/env policy off; əvvəl admin enrollment/recovery sınağı, sonra iki qatın birgə aktivləşdirilməsi lazımdır. Mövcud hesablar bloklanmayıb |
| Cloudflare plan WAF/Bot/rate qaydaları və origin firewall allowlist | **CONFIGURATION REQUIRED** — plan/account/provider review; aktiv edilmiş kimi təqdim edilmir. Origin bypass riskinin bağlanması ayrıca operator işi olaraq qalır |
| Fail2ban, OS security updates və resource alert timer | **CONFIGURATION REQUIRED** — mövcud server/SSH girişini qorumaq üçün ayrıca root review və maintenance window |
| Strict CSP enforcement | **CONFIGURATION REQUIRED** — real report-lar əsasında nonce/hash və third-party uyğunluq yoxlamasından sonra |
| Tam canlı grants/RLS/storage negative audit | **CONFIGURATION REQUIRED** — catalog snapshot və target migration yoxlaması var; bütün production policy kombinasiyalarının istismar sınağı aparılmayıb |

## Bərpa yolu

Keçid zamanı app/Auth/Nginx avtomatik rollback yolu hazırlanıb və staging failure
guard-ları test edilib. Uğurlu canlı deployment-dən sonra rollback qəsdən
işlədilməyib. Detallı manual prosedur [GUARDED_ROLLOUT.md](GUARDED_ROLLOUT.md)-dədir.
Əvvəlki tətbiq `header-hover-20261101/app`, private PM2 config yeni release-in
`rollback.config.cjs` faylıdır. Əvvəlki Auth stopped container kimi saxlanılıb.
Nginx-in əvvəlki konfiqurasiyası root-private rollout qovluğundadır. Additive
migration-lar və OFF MFA flag-i köhnə app ilə uyğun saxlanılır; live sifarişlərin
üzərinə database backup-ı restore etmək rollback addımı deyil.
