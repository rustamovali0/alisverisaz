# HTTP və Server Action səthi

Audit: 2026-11-02, App Router; API Route Handler-lər `src/app/api/**/route.ts`. Native production Next tətbiqidir; `frontend/` legacy SPA ayrıca CI-də saxlanır, hazırkı VDS prosesinə gateway olaraq qoşulmur.

| Yol / metod | Autentifikasiya və icazə | Input / CSRF | Yeni ortaq limit | Status |
|---|---|---|---|---|
| GET `/api/auth/session` | serverdə `getUser`, public/admin cookie namespace ayrı; yalnız öz display profili | scope enum, profile flag; GET read-only; token qaytarılmır | 120/IP/dəq | IMPLEMENTED, TESTED |
| GET `/api/notifications` | verified own session + RLS; guest empty; user_id qəbul edilmir | read-only, private no-store | 120/IP/dəq | IMPLEMENTED, TESTED |
| GET `/api/marketplace/products` | ictimai aktiv məhsullar | bounded q/category/cursor/limit, enum filters | 120/IP/dəq | IMPLEMENTED, TESTED |
| GET `/api/marketplace/related-products` | ictimai oxu | bounded IDs/cursor/limit | 120/IP/dəq | IMPLEMENTED, TESTED |
| GET `/api/marketplace/searches` | ictimai populyar sözlər | read-only | 60/IP/dəq | IMPLEMENTED |
| POST `/api/marketplace/searches` | anonim statistik hadisə, şəxsi account yazısı deyil | origin/fetch-site, JSON MIME, 4KB streamed bound, term type/length; RPC bound params | 60/IP/dəq + auth search counter | IMPLEMENTED, TESTED |
| GET `/api/security/turnstile-site-key` | public sitekey; secret verilmir | runtime env-only, no-store; database/CPU işi yoxdur | Nginx ümumi API siyasəti; tətbiqdə ayrıca limit qəsdən yoxdur | IMPLEMENTED, CONFIGURATION REQUIRED |
| POST `/api/security/csp-report` | ictimai telemetry | 4KB, yalnız directive log edilir; URL/sample/cookie atılır | 30/IP/dəq | IMPLEMENTED, TESTED |
| GET `/api/products/import-template` | `requireRole(seller)` | fixed server-generated XLSX; private no-store | 10/IP/dəq | IMPLEMENTED |
| POST `/api/telegram/webhook` | constant-time secret yoxlaması + mövcud bot actor/chat/unlock nəzarəti | bounded 64KB JSON + update schema | mövcud Telegram actor DB limiti + Nginx edge siyasəti; trusted webhook header olmadan parse yoxdur | IMPLEMENTED, TESTED |
| GET `/auth/confirm` və localized alias | Supabase token_hash verification; recovery/signup növləri | safe redirect, configured public origin, private no-store/no-referrer | 20/IP/dəq | IMPLEMENTED, TESTED (recovery) |
| GET `/auth/callback` və localized alias | Supabase OAuth code exchange/PKCE | safe redirect, public origin, query/code log edilmir | 20/IP/dəq | IMPLEMENTED, TESTED |
| GET `/email-templates/recovery.html` | generic public template, recipient/token yoxdur | persisted template schema validation + HTML escaping; server-cache 60s | GoTrue/template integration; CDN/origin coarse limits | IMPLEMENTED, TESTED |
| GET/POST `/{locale}/logout` | GET read-only confirmation; POST verified own cookie session | POST requires exact configured Origin + fetch-site/referer checks; 303 redirect | Auth ingress coarse limit | IMPLEMENTED, TESTED |

## Sabit REST URL-i olmayan əməliyyatlar

Server Actions Next-in POST/Origin-Host yoxlaması ilə işləyir; action ID authentication deyil. Bütün auth/ownership yoxlamaları serverdə qalır. 30MB Next action body limiti və 32MB Nginx limiti mövcud multi-image axını üçün saxlanılır. Action nəticəsində status/retryAfter metadata-sı var; **Next Server Actions HTTP cavabı framework səbəbi ilə 200 ola bilər**. Real Route Handler limitləri 429/Retry-After və storage outage zamanı 503/no-store qaytarır. UI mövcud Azərbaycan dilində `message` göstərir. HTTP-level Auth POST throttling üçün Nginx konfiqurasiyası tələb olunur.

| Əməliyyat | Server qoruması / siyasət |
|---|---|
| Login (public/admin) | 5 account/15 dəq, 200 IP/15 dəq; atomik consume auth-dan əvvəl; success yalnız account counter-i sıfırlayır; configured CAPTCHA tokeni məcburidir; generic credential error |
| Register | 3 account/saat, 30 IP/saat; buyer/seller allowlist, input/terms checks, CAPTCHA; yeni hesablar üçün native confirmation flow; duplicate response generic; existing users backfill/lockout yoxdur |
| Forgot password | 3 account/saat, 30 IP/saat; generic response, lookup+SMTP background; configured CAPTCHA; URL trusted origin; single-use GoTrue token |
| Contact / review / message | 5 identifier/saat və geniş IP budget; məqsədə bağlı CAPTCHA; reviews/message guest-store/owner/eligibility yoxlamaları saxlanılır |
| Public cart / promo reads | Array type + 100 ID input ceiling, UUID allowlist, max 50 selected; cart JSON 100KB; cart/promo 120 IP/dəq, preview 30 IP/dəq; denied read returns empty/result message |
| Public view analytics | UUID resource + 80-character visitor bound; 120 IP/dəq distributed budget inside background task, no DB work after denial |
| Product create | `requireRole(seller)`, store ownership/moderation, 10 write/account/dəq; RLS/field guard; limits/price server validation |
| Image upload helper | server-only callers, MIME/extension + real Sharp format, SVG/UTF-16 vector reject, 36MP/size ceilings, WebP reencode, 50 image/folder/dəq, random storage key; bucket public/private ayrı saxlanır |
| Admin / seller digər action-ları | mövcud `requireRole`, `requireRadmin`, ownership/entitlement checks; common admin MFA gate; service-role actor serverdə müəyyənləşdirilir; mövcud business quotas saxlanır |
| Admin MFA enroll/verify | verified admin cookie, owned factor, existing factor varsa enroll üçün AAL2, 10 account/15 dəq; kod/QR log edilmir |
| Checkout/payments | mövcud atomic DB price/stock validation, store split, idempotency və permission tests; kart provayderi webhook-u mövcud deyil, əlavə edilməyib |

`Server Action` static inventory: `node scripts/security/inventory.mjs`. “delegated-review” avtomatik zəiflik hökmü deyil; wrapper/helper authorization ayrıca qiymətləndirilməlidir. Live bütün RLS grant/policy vəziyyəti root catalog auditindən sonra təsdiqlənə bilər; migration faylı canlı tətbiq sübutu deyil.
