# Təhlükəsizlik yoxlamalarının nəticələri

Tarix: 2026-11-02. Lokal native Next tətbiqi, PGlite PostgreSQL fixture-ləri və ayrıca legacy frontend. Production-a DDoS, brute-force, stress və ya aktiv zəiflik istismarı göndərilməyib.

| Yoxlama | Nəticə | Sübutun sərhədi |
|---|---|---|
| Native Vitest unit/integration/security | **TESTED — 465/465, 68 fayl keçdi** | Auth API və Redis adapter testləri mock istifadə edir; SQL migrations actual PGlite-də çalışır |
| TypeScript `npm run typecheck` | **TESTED — keçdi** | Native source + tests; legacy ayrıca build-də |
| Native production build | **TESTED — keçdi** | Public test URL/key placeholder-ləri ilə; production secret tələb edilmədi |
| Legacy frontend ESLint | **TESTED — keçdi** | Native root-da ayrıca ESLint konfiqurasiyası yoxdur |
| Legacy frontend Vitest | **TESTED — 10/10 keçdi** | Vitest 5.0.5 yenilənməsindən sonra |
| Legacy frontend production build | **TESTED — keçdi** | TypeScript + Vite |
| Gateway regression `node --test deploy/marketplace-gateway.test.mjs` | **TESTED — 12/12 keçdi** | Lokal mock backend/gateway; production hazırda native runtime-dır |
| Native production runtime HTTP | **TESTED — 2 cavab ssenarisi keçdi** | Yalnız loopback: public sitekey 200 + security headers; limiter store olmadıqda catalog API 503, Retry-After 30, no-store. Ümumilikdə 4 lokal GET, əlavə production trafiki yoxdur |
| Root dependency audit | **TESTED — 0 High/Critical, 8 Moderate** | Eyni minimatch advisory üçün 2026-12-02-dək dar istisna; həll edilməyib |
| Legacy frontend dependency audit | **TESTED — 0 High/Critical, 11 Moderate** | Əvvəlki 2 kritik paket qeydi aradan qalxıb; qalan minimatch zənciri dar istisnadır |
| Tracked-file secret scan | **TESTED — tapıntı yoxdur** | Private key/Supabase/GitHub/AWS məlum formatları üçün heuristika; full Git history və bütün mümkün secret formatları audit edilməyib |
| Python infra nümunələri | **TESTED — syntax compile keçdi** | Config quraşdırılması deyil; firewall/SSH dəyişdirilmədi |
| `git diff --check` | **TESTED — keçdi** | Whitespace check |
| Native GoTrue real CAPTCHA / email verification / MFA E2E | **CONFIGURATION REQUIRED** | Ayrı staging GoTrue parametrləri və operator-controlled MFA enrollment tələb olunur; canlı istifadəçi/faktor dəyişdirilmədi |
| Production RLS/grants/storage policies | **BLOCKED** | Deploy hesabında root/Docker/catalog giriş səlahiyyəti yoxdur; read-only SQL təqdim edilib |
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
