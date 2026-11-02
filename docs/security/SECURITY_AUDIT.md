# ALISVERIS.AZ — təhlükəsizlik auditi və tətbiq hesabatı

Audit tarixi: **2026-11-02**. Source başlanğıcı `9fb7535606fe730cbcb06dead1420fdb74c01e69`, branch `codex/enterprise-security`. Bu hesabat branch-dəki dəyişiklikləri təsvir edir; **production hardening deploy edilməyib**. Dizayn yenidən qurulmayıb, sifariş yaradılmayıb, məktub göndərilməyib, istifadəçi datası dəyişdirilməyib. Yalnız adi DNS/HEAD sorğuları və mövcud deploy SSH girişindən read-only infrastruktur yoxlaması aparılıb. Brute-force, DDoS, stress və aqressiv skan aparılmayıb.

## 1. Arxitektura və əhatə

- Native production: **Next.js 16.4.3**, React 19.3.1, TypeScript; App Router, `src/proxy.ts`, Route Handler və Server Actions. `frontend/` ayrıca legacy Vite tətbiqidir və cari production prosesini əvəz etmir.
- Supabase SSR cookie sessiyaları: public və admin namespace ayrı; serverdə `getUser` ilə yoxlama, profile role və sessiya ləğvi nəzarəti. Verilənlərdə `customer`, `seller`, `admin`; RAdmin ayrıca idarəetmə/giriş qatıdır. Menyu gizlətmək icazə hesab edilmir.
- İstehsalat backend-i `api.alisveris.az` self-hosted Supabase-dir. Ayrı Cloud layihəsi `fxfycfkwodywmnzgkyvl` bu miqrasiyaların hədəfi deyil.
- PostgreSQL/RLS, parametrli Supabase/RPC çağırışları; serverdə service role. Məhsul şəkilləri server-side Sharp/WebP və R2 ilə emal edilir. Rəylər, mesajlar, kampaniyalar və e-poçt renderer-ləri ayrıca yoxlanıb.
- Kart provayderi və kart webhook-u tapılmayıb: hazırkı nağd/WhatsApp və DB sifariş axını saxlanılıb. Mövcud atomic checkout qiymət/stok/idempotency testləri qalır.
- Nginx → loopback Next/PM2; Redis və PostgreSQL loopback. Cloudflare proxy faktiki aktivdir. Tam WAF/Bot/plan konfiqurasiyası hesab girişi olmadan təsdiqlənmir.
- Bütün aşkar edilmiş HTTP route-lar və export edilmiş action-lar [API inventarında](API_INVENTORY.md) və təkrar yaradıla bilən [statik inventarda](SURFACE_INVENTORY.json) verilib. Statik guard göstəricisi təhlükəsizliyin tək sübutu deyil; wrapper-lər ayrıca oxunub.

## 2. Tapıntılar və səviyyələr

Səviyyə istismar təsiri və real əhatə ilə qiymətləndirilib. Dependency severity vendor qiymətidir; test alətində Critical tapılması production Next prosesində RCE sübutu deyil.

| ID | Səviyyə | Əvvəlki vəziyyət / nəticə | Branch-də tədbir və status |
|---|---|---|---|
| SEC-01 | Critical (dev dependency) | Legacy frontend Vitest 3 / tinypool dependency zəncirində kritik prototype-pollution/RCE advisories; iki kritik paket qeydi | Vitest 5.0.5 və lockfile yeniləndi; frontend lint, test, build keçdi; auditdə 0 High/Critical. **IMPLEMENTED, TESTED** |
| SEC-02 | High | Self-hosted app visitor-in verdiyi CF/True-Client/XFF header-lərini IP kimi qəbul edə bilirdi; limit bypass riski | Yalnız explicit trusted ingress, Nginx overwrite və IPv6 /64; uyğunsuz halda unknown. **IMPLEMENTED, TESTED**; ingress **CONFIGURATION REQUIRED** |
| SEC-03 | High | DB read/check/upsert rate counter paralel sorğularda atomik deyildi; process-lər arası sabit qoruma yox idi | Shared Redis Lua və ya PostgreSQL atomic RPC, storage outage 503, account + IP, success shared IP-ni sıfırlamır. **IMPLEMENTED, TESTED**; store/migration **CONFIGURATION REQUIRED** |
| SEC-04 | High | Bəzi login/OAuth yolları boş CAPTCHA tokeni ilə yoxlamanı keçə bilirdi; public formalar tam əhatə edilmirdi | Məqsəd/hostname yoxlaması, widget və server verification, native GoTrue token ötürməsi. **IMPLEMENTED, TESTED**; direct Auth enforcement **CONFIGURATION REQUIRED** |
| SEC-05 | High | Marketplace yeni hesabı admin API ilə auto-confirm edirdi; direct Auth CAPTCHA/recovery siyasəti ayrıca idi | Default native signup + email verification; seller yalnız müraciətçi/customer olaraq qalır. **IMPLEMENTED, TESTED**; GoTrue confirmation/SMTP ayarları **CONFIGURATION REQUIRED** |
| SEC-06 | High | Öz profile row-unu update etmək revocation və approval kimi sütunları dəyişməyə imkan verə bilərdi | Security-column trigger, own ID, role/email/revocation/approval qoruması, insert preapproval bloklanır. **IMPLEMENTED, TESTED** migration. Köhnə RLS-də role yoxlaması olduğuna görə təsdiqlənmiş Critical role-escalation kimi təqdim edilmir. Live grant auditi **BLOCKED** |
| SEC-07 | High | Administrator üçün məcburi AAL2 qatı yox idi | TOTP UI, own factor checks, common server authorization gate, restrictive RLS + is_admin gate; rollout default off. **IMPLEMENTED, TESTED**; aktivləşdirmə **CONFIGURATION REQUIRED** |
| SEC-08 | High | Origin IP-yə Host/SNI ilə adi HTTPS HEAD 200 nginx qaytarır; Cloudflare bypass mümkündür | CIDR/real-IP və vhost qoruma nümunəsi, risk/rollback planı. **CONFIGURATION REQUIRED**; firewall dəyişdirilməyib |
| SEC-09 | High (operational) | Əvvəlki istifadəçi screenshot-unda root şifrəsi görünmüşdü | Dəyər istifadə edilmədi və sənədə yazılmadı. Root operator şifrəni rotasiya etməli, SSH alternativ girişini saxlamalıdır. **CONFIGURATION REQUIRED** |
| SEC-10 | Medium | Reset cavabı email-in qeydiyyatda/aktiv olduğunu açıqlayırdı | Eyni cavab; lookup + çatdırılma response-dan sonra, account vəziyyəti response-a düşmür. **IMPLEMENTED, TESTED** |
| SEC-11 | Medium | Raw PostgREST OR search-də vergül/mötərizə/quote filtr qrammatikasına qarışırdı; cursor tarixi sərbəst parse edilirdi | Quoted/escaped pattern, UUID və strict ISO timestamp; PostgreSQL mikro-saniyələri saxlanır. **IMPLEMENTED, TESTED**. Raw SQL injection sübutu deyil |
| SEC-12 | Medium | Bahalı catalog/session/notification oxuları, açıq analytics yazıları, cart read massivləri abuse-a açıq idi | API shared limits və HTTP 429/Retry-After, bounded arrays/JSON, background analytics budget. **IMPLEMENTED, TESTED** |
| SEC-13 | Medium | Aktiv vector faylını ASCII sniff ilə müəyyən etmək kifayət etmirdi; Telegram download/body bound yetərli deyildi | Real raster decoder format allowlist, SVG/UTF-16 reject, pixel/size limit, webhook 64KB, fixed-origin bounded fetch/no redirects. **IMPLEMENTED, TESTED** |
| SEC-14 | Medium | GET logout state dəyişirdi; wildcard/preload HSTS bütün subdomain-lər üçün fərz edilirdi | GET confirmation; exact-origin POST + 303, SameSite/Secure; root HSTS, wildcard opt-in. **IMPLEMENTED, TESTED**. Köhnə cached HSTS dərhal yox olmur |
| SEC-15 | Medium | Root audit 8, legacy frontend audit sonrası 11 moderate paket qeydi eyni minimatch advisory-dən gəlir | Exact advisory + paket allowlist ilə 2026-12-02-dək müvəqqəti CI istisnası; yeni advisory/severity/expiry CI-ni dayandırır. **CONFIGURATION REQUIRED**: uyğun upstream yeniləmə/refactor; həll edilmiş sayılmır |
| SEC-16 | Low / defense in depth | Strict script CSP üçün nonce/hash planı yoxdur; geniş mövcud CSP lazımlı inteqrasiyaları dəstəkləyir | Daha sərt **Report-Only** namizəd və sensitive URL/sample saxlamayan report endpoint. **IMPLEMENTED, TESTED**; strict enforcement **CONFIGURATION REQUIRED** |

## 3. Qatlara görə status

| Sahə | Status və məhdudiyyət |
|---|---|
| DDoS / WAF / bot / HTTPS edge | **CONFIGURATION REQUIRED**. Proxy sübut olunub, qaydaların/planın özü təsdiqlənməyib; [Cloudflare addımları](../CLOUDFLARE_SECURITY_SETUP.md). App rate limiter volumetric DDoS-i dayandırmır |
| Distributed rate limit | **IMPLEMENTED, TESTED**. Redis Lua adapter + actual PostgreSQL SQL tests. Production Redis ACL/eviction/persistence yoxlaması və SQL migration ayrıca; real Redis multi-instance load testi bu işdə edilməyib |
| Auth / reset / registration | **IMPLEMENTED, TESTED**. Native provider setup **CONFIGURATION REQUIRED**. Supabase direct API CAPTCHA/quotas frontend guard ilə avtomatik qorunmur |
| Admin / seller BOLA | **IMPLEMENTED, TESTED**. Mövcud requireRole/requireRadmin/owned-store nəzarəti saxlanılıb; MFA əlavə edildi. Live bütün policy/SECURITY DEFINER grant inventory-si root catalog girişi olmadığından **BLOCKED** |
| RLS migrations | **IMPLEMENTED, TESTED** lokal PGlite fixture-də actual SQL. Production schema compatibility və bütün cədvəllərin RLS aktivliyi **BLOCKED**; migration canlı bazaya tətbiq edilməyib |
| SQL/filter injection | **IMPLEMENTED, TESTED**; bound RPC parametrləri, quote edilmiş PostgREST dəyərləri. İstifadəçidən raw SQL/identifikator icra edilmir |
| XSS | **TESTED** React escaping, JSON-LD script boundary, mövcud HTML sanitizer və e-poçt escaping testləri; iframe srcdoc preview mövcud sandbox ilə. Heç bir repo testi bütün browser/extension XSS risklərinə zəmanət deyil |
| CSRF | **IMPLEMENTED, TESTED** Next Server Action Origin/Host, public JSON fetch-site/origin, logout same-origin POST; GET logout artıq mutation etmir |
| SSRF / webhook | **IMPLEMENTED, TESTED** fixed trusted HTTPS origin, credentials/redirect reject, timeout/stream limits, constant-time secret; generic attacker URL fetch endpoint yaradılmayıb |
| Security headers | **IMPLEMENTED, TESTED** existing frame/nosniff/referrer/permissions siyasətləri qorunur; strict CSP report-only; HSTS subdomain opt-in |
| File uploads / storage | **IMPLEMENTED, TESTED** actual decode/reencode + limits, filename/ownership checks; private/public bucket permissions və R2 credential ACL canlı audit **BLOCKED** |
| Session/token | **IMPLEMENTED, TESTED** verified getUser + revocation, separate namespaces, Secure/SameSite. Browser Supabase SDK cookies oxuduğuna görə HttpOnly/BFF migration bu patch-də edilməyib; subdomain cookie scope ayrıca review tələb edir |
| Monitoring | **IMPLEMENTED** sanitized JSON events, bounded CSP telemetry, resource/logrotate examples. Timer, log collector/retention, incident alert destination **CONFIGURATION REQUIRED**; yeni paid xidmət yoxdur |
| Dependencies / secrets / CI | **IMPLEMENTED, TESTED** root+frontend audits, pinned Actions, weekly Dependabot, tracked-file heuristic scan; full Git-history/provider secret audit **BLOCKED** / ayrıca təhlükəsiz iş axını tələb edir |
| Kart ödəniş webhook-u | **NOT APPLICABLE**: kart provayderi bu arxitekturada qoşulmayıb |

## 4. Testlər və yoxlamalar

Yekun nəticə: **465 native + 10 legacy frontend + 12 gateway = 487 keçən test**, TypeScript, frontend ESLint və hər iki production build. Ətraflı sübut və məhdudiyyətlər [TEST_RESULTS.md](TEST_RESULTS.md)-dədir. Əsas əlavə testlər:

- 40 paralel consume çağırışında yalnız 5 icazə: actual PostgreSQL funksiyası; expiry, service-only grants və bound SQL input.
- Redis Lua arguments / hashed identity / fail-closed outage / başqa store-a fail-open keçməmə; real Redis server üzərində yük sınağı aparılmayıb.
- Actual SQL fixture RLS: buyer/seller order isolation, profile security sütunları, yeni profil approval bypass-ı, mərhələli admin AAL2.
- Public/admin authorization və MFA factor ownership; CAPTCHA missing/wrong hostname/action/reuse, native single redemption.
- API 429/503, Retry-After/no-store, denied read-in bazaya getməməsi; public cart/analytics abuse və latency regression.
- PostgREST reserved characters + bound PostgreSQL ILIKE, cursor precision; XSS script delimiter, CSRF logout/JSON, SSRF redirect/body/timeout, actual raster + UTF-16 SVG.
- Native auth/signup/reset, seller registration, same-password handling, checkout server price/stock/idempotency və əvvəlki regression testləri.

Native root layihədə ayrıca ESLint script-i yoxdur; typecheck, test və production build işlədilir. Legacy frontend-də ESLint ayrıca keçir. Production-a qarşı test hesabı/sifariş/e-poçt və aktiv istismar yoxlaması aparılmayıb.

## 5. Dəyişdirilən fayllar

Tam manifest: [CHANGED_FILES.txt](CHANGED_FILES.txt). Əsas qruplar:

- `src/lib/security/`: trusted IP, distributed limiter, PostgREST escaping, API guards, bounded fetch/body, MFA, sanitized events və header siyasətləri.
- `src/lib/auth/`, auth UI, confirmation template/routes: CAPTCHA, verification, enumeration-safe reset, session və mərhələli admin MFA.
- Route Handler-lər; analytics/cart/product/upload/message/review/support/Telegram: limits, validation, ownership saxlanması.
- Üç additive `20261102*.sql` migration; `tests/security-*` və regression fixture-ləri.
- `deploy/security/`, `scripts/security/`, `.github/`, `.env.example`, iki dependency root-un audit siyasəti və legacy frontend lockfile.

## 6. Tətbiq, env və rollback

Tam ardıcıllıq: [DEPLOYMENT.md](DEPLOYMENT.md). VDS riskləri: [INFRASTRUCTURE.md](INFRASTRUCTURE.md). Mövcud production release-i əvvəlcədən qoruyun; DB/storage/private env recovery-ni yoxlayın. Əvvəl staging schema/GoTrue uyğunluğu, sonra Nginx trusted headers, Redis və üç migration, native CAPTCHA/verification, yeni app release, sonda mərhələli MFA. Firewall/SSH/DNS dəyişməsi ayrıca operator review-sindən sonra. Hər kritik qat üçün rollback həmin sənəddədir; core RLS-in söndürülməsi rollback sayılmır.

Yeni env adları `.env.example`-dədir: `TRUSTED_PROXY_MODE`, `SECURITY_REDIS_URL` (və ya existing `REDIS_URL`), `TURNSTILE_ALLOWED_HOSTNAMES`, `AUTH_CAPTCHA_MODE`, `AUTH_REQUIRE_EMAIL_VERIFICATION`, `ADMIN_MFA_POLICY`, `HSTS_INCLUDE_SUBDOMAINS`; mövcud server-only Supabase/R2/SMTP açarları Git-ə daxil edilmir. App standalone hazır limiter store/uğurlu ingress olmadan deploy edilməməlidir: unknown IP bucket və fail-closed storage qanuni sorğuları da dayandıra bilər.

Qalan məhdudiyyətlər: Next Server Actions nəticəsi HTTP 200 içində limit məlumatı daşıya bilər; real HTTP 429 Route Handler və sazlanmış ingress-dədir. Auth server bypass-ı native GoTrue CAPTCHA/quotas tələb edir. Strict CSP yalnız müşahidə rejimindədir. Bütün subdomain/TLS və canlı RLS/grants yoxlanmayıb. Root şifrəsinin rotasiyası, origin bypass-ın bağlanması, Fail2ban və alerts operator işi olaraq qalır. Bu branch bütün internet hücumlarının qarşısının alındığına və ya layihənin tam sertifikatlaşdırılmış təhlükəsizliyinə zəmanət vermir.

Rəsmi istinadlar: [PostgREST quoted values](https://docs.postgrest.org/en/stable/references/api/url_grammar.html), [Supabase native CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [tinypool advisory](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).
