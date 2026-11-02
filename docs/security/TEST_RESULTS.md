# Təhlükəsizlik yoxlamalarının nəticələri

Tarix: 2026-11-02. Lokal native Next tətbiqi, PGlite PostgreSQL fixture-ləri və ayrıca legacy frontend. Production-a DDoS, brute-force, stress və ya aktiv zəiflik istismarı göndərilməyib.

**Cari yekun:** təhlükəsizlik release-i 18:13 UTC-də canlıya keçib; 25 canlı smoke
və ayrıca post-deploy yoxlamalar keçib. Tam nəticə və qalan manual tədbirlər
[production hesabatında](PRODUCTION_DEPLOYMENT_20261102.md) göstərilib.

| Yoxlama | Nəticə | Sübutun sərhədi |
|---|---|---|
| Native Vitest unit/integration/security | **TESTED — 465/465, 68 fayl keçdi** | Auth API və Redis adapter testləri mock istifadə edir; SQL migrations actual PGlite-də çalışır |
| TypeScript `npm run typecheck` | **TESTED — keçdi** | Native source + tests; legacy ayrıca build-də |
| Native production build | **TESTED — keçdi** | Public test URL/key placeholder-ləri ilə; production secret tələb edilmədi |
| Legacy frontend ESLint | **TESTED — keçdi** | Native root-da ayrıca ESLint konfiqurasiyası yoxdur |
| Legacy frontend Vitest | **TESTED — 10/10 keçdi** | Vitest 5.0.5 yenilənməsindən sonra |
| Legacy frontend production build | **TESTED — keçdi** | TypeScript + Vite |
| Gateway regression `node --test deploy/marketplace-gateway.test.mjs` | **TESTED — 12/12 keçdi** | Lokal mock backend/gateway; production hazırda native runtime-dır |
| Native local production-mode runtime HTTP | **TESTED — 2 cavab ssenarisi keçdi** | Yalnız lokal loopback: public sitekey 200 + security headers; limiter store olmadıqda catalog API 503, Retry-After 30, no-store. Bu storage-outage testi canlı serverdə edilməyib |
| Root dependency audit | **TESTED — 0 High/Critical, 8 Moderate** | Eyni minimatch advisory üçün 2026-12-02-dək dar istisna; həll edilməyib |
| Legacy frontend dependency audit | **TESTED — 0 High/Critical, 11 Moderate** | Əvvəlki 2 kritik paket qeydi aradan qalxıb; qalan minimatch zənciri dar istisnadır |
| Tracked-file secret scan | **TESTED — tapıntı yoxdur** | Private key/Supabase/GitHub/AWS məlum formatları üçün heuristika; full Git history və bütün mümkün secret formatları audit edilməyib |
| Python rollout/retention + Node recovery | **TESTED — 24 Python + 8 Node keçdi** | Guard-lar, backup authentication, hash receipt, temporary schema izoləsiyası, cleanup; firewall/SSH dəyişdirilmədi |
| `git diff --check` | **TESTED — keçdi** | Whitespace check |
| Native GoTrue CAPTCHA / email verification configuration | **TESTED** | Real disposable GoTrue CAPTCHA denial keçib; canlı health/settings və root config receipt yoxlanıb. Real signup/reset məktubu E2E edilməyib |
| Admin MFA / authenticated checkout / mail E2E | **CONFIGURATION REQUIRED** | Operator-controlled enrollment/recovery və uyğun staging test hesabları tələb olunur; mövcud faktor/hesab/sifariş dəyişdirilmədi |
| Production RLS/grants/storage tam negative audit | **CONFIGURATION REQUIRED** | Root catalog snapshot və üç target migration yoxlanıb/tətbiq edilib; bütün production grants/policy/storage kombinasiyalarının istismar sınağı aparılmayıb |
| Cloudflare WAF/edge rules, origin restriction, Fail2ban | **CONFIGURATION REQUIRED** | Sadə DNS/HEAD və read-only xidmət vəziyyəti yoxlanılıb, hesab qaydaları aktivləşdirilməyib |

## Təkrar yoxlama

```sh
npm ci
npm run security:audit
node scripts/security/dependency-audit.mjs --frontend
npm run security:secrets
npm test
npm run typecheck
NEXT_PUBLIC_APP_URL=https://shop.example.test NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=qa-placeholder npm run build
npm ci --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
node --test deploy/marketplace-gateway.test.mjs
```

Frontend auditini onun `npm ci --prefix frontend` addımından sonra icra edin. Nümunə public placeholder-lər real məlumatlara giriş vermir. Build-in ilk env-siz təkrarı tələb olunan `NEXT_PUBLIC_SUPABASE_URL` olmadığı üçün dayandı; düzgün public test env ilə təkrar build tam keçdi.

Yerli maşının yüklü olduğu əlavə tam təkrarda timeout-lar yarandı. Test worker sayı 2 ilə məhdudlaşdırıldı; bir mövcud sifariş SQL testində cold PostgreSQL/WASM startup daxil olduğu üçün 15s limit digər SQL testləri ilə uyğun 30s edildi. Heç bir assertion və permission/price/stock gözləntisi zəiflədilmədi. Həmin 6 sifariş testi ayrıca keçdi; sonra tam 465 testin hamısı 215 saniyədə keçdi. Bu dəyişiklik production request timeout-u və ya performans hədəfi deyil.

Loglar workspace-in private `work/enterprise-*.log/json` fayllarındadır; credentials/body/token çıxarılmır, Git-ə log əlavə edilmir. Dəqiq runtime yoxlaması `.next` build-in lokal serverində aparıldı; server sınaqdan sonra dayandırıldı.

## Guarded rollout əlavə yoxlamaları

- **TESTED — 17/17 Python:** 10 release retention/publication + 7 rollout safety testi. Mövcud/failed rollout-un təkrarlanmaması, off-server hash receipt, checksum fail-closed, vahid SQL transaction və ingress layout qoruması yoxlanır. Docker/production SQL çağırılmır.
- **TESTED — 4/4 Node:** AES-GCM backup roundtrip, dəyişdirilmiş ciphertext, dəyişdirilmiş metadata/AAD və yanlış RSA private key. Üç manipulyasiya qəbul edilmir.
- **TESTED — ops syntax və tracked-file secret scan:** keçdi. Recovery private key repo xaricindədir.
- **CONFIGURATION REQUIRED — root `prepare` / `activate`:** izolə tam restore, real GoTrue CAPTCHA və canlı smoke nəticələri root rollout receipt gələnədək bu lokal testlərin nəticəsi kimi təqdim edilmir.

Əlavə kod yalnız rollout/ops testləri və sənədlərdir; əvvəlki native runtime build-i dəyişməyib. Əvvəlki 487 application/frontend/gateway testi ilə birlikdə 508 avtomatik test var; 508 testin hamısının bu əlavə mərhələdə yenidən çalışdırıldığı iddia edilmir.

İlk izolə Auth timeout-undan sonrakı davam patch-i: **21/21 Python** testi
keçdi. Yeni 4 test DB/port alias izoləsiyasını, diagnostic redaction-u, mövcud
backup hash-i uyğun olmadan resume-in rəddini və container cleanup-dan əvvəl
logun saxlanmasını yoxlayır. CI-yə daxil edilən crypto testləri ilə ops sayı 25,
bütün suite-lər üzrə say 512-dir. Real Auth startup səbəbi diagnostic alınana
və isolate health/CAPTCHA keçənə qədər `CONFIGURATION REQUIRED` qalır.

`42501` startup diagnostic-inə uyğun schema seçimi patch-i: **24/24 Python +
4/4 crypto** keçdi. Yeni 3 regression testi connection TLS parametrlərinin
qorunmasını, search_path düzəlişinin yalnız disposable database-ə aid olmasını,
production hədəfinin və çatışmayan Auth migration tarixçəsinin rəddini yoxlayır.
515 ümumi avtomatik test var; son ops-only mərhələdə 28-i yenidən çalışdırılıb.
İzolə real GoTrue sınağının son nəticəsi operator receipt-i gələnədək pending-dir.

Off-server recovery receipt helper üçün əlavə **4/4 Node** testi keçdi: düzgün
şifrəli export, səhv ciphertext hash-i, autentik ciphertext içində gözlənilməyən
plaintext hash-i və hazırlanmamış root state. Uğursuz yoxlama yeni receipt
yaratmır; müvəqqəti plaintext silinir. Son ops suite **24 Python + 8 Node = 32**
testdir; tətbiq/frontend/gateway suite-ləri ilə ümumi test sayı 519-dur.

17:54 UTC root receipt ilə real disposable PostgreSQL **tam restore + üç
migration + auth namespace + native GoTrue v2.197.0 CAPTCHA** sınağı **TESTED**
oldu. Müvəqqəti Auth-a CAPTCHA-sız tək sorğu CAPTCHA xətası ilə rədd edildi.
Production-a login/brute-force sorğusu göndərilmədi. 17:55 UTC-də real encrypted
backup off-server authentication və plaintext ölçü/hash yoxlamasından keçdi.
Source `e817e97` üçün CI run `41494717933` **success**; bütün 519 test və mövcud
CI build/type/lint/security addımları keçdi. MFA enrollment və canlı authenticated
checkout/mail E2E bu nəticələrə daxil deyil. Həmin 17:55 UTC mərhələsindən sonra
live cutover 18:13:52 UTC-də tamamlanıb; root və app receipt-ləri `deployed`-dir.
