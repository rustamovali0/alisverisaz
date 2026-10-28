# ALİSVERİS.AZ — UI və təhlükəsizlik yoxlaması

Tarix: 27 oktyabr 2026. Əhatə: Next.js tətbiqinin kodu, mövcud Vitest/PGlite testləri, asılılıq auditi, icazəsiz HTTP sorğuları və responsive brauzer yoxlaması. Bu sənəd tam infrastruktur pentesti və ya bütün canlı Supabase RLS siyasətlərinin sertifikasiyası deyil.

## Nəticə və tətbiq edilən düzəlişlər

- Səbət nişanı: 22 px minimum en/hündürlük, `line-height: 1`, mərkəzlənən rəqəm, 100 və yuxarısı üçün `99+`; əlçatan link adı tam məhsul sayını saxlayır. Əvvəl 16 px nişanın sərhədləri rəqəmin sətir hündürlüyünə yer qoymurdu.
- Mobil toxunma sahələri: menyu, səbət, məhsulun favorit və səbət düymələri, qeydiyyat düymələri minimum 44 px. Dekorativ nişanın özü toxunma elementi deyil.
- Axtarış statistikasının POST endpoint-i: JSON-only 415, 4096 baytlıq streaming limit 413, sintaksis və `term` tipi üçün 400, cross-site üçün 403. Bu yoxlamalar DB/rate-limit çağırışından əvvəldir. Təkcə `Content-Length`-ə etibar edilmir.
- Düzəlişlər: `src/lib/http/read-json.ts`, `src/app/api/marketplace/searches/route.ts`, `src/components/layout/marketplace-header.tsx`, `src/app/marketplace-live.css`.

## OWASP Top 10:2025 yoxlama siyahısı

`[x]` yalnız göstərilən sübutun yoxlanmasını bildirir; bütün kateqoriyanın qüsursuzluğu demək deyil.

| Risk | Yoxlama və sübut | Qalan yoxlama |
|---|---|---|
| A01 Broken Access Control | [x] `authorization.test.ts`: başqa satıcının məhsulu/sifarişi, rol və mağaza sərhədləri; RAdmin rol yoxlamaları | [ ] İki müstəqil real test hesabı ilə canlı RLS matrisi |
| A02 Security Misconfiguration | [x] CSP, HSTS, nosniff, frame-ancestors; guest session private cache | [ ] Origin firewall, trusted-proxy konfiqurasiyası və CORS-un bütün deployment-lərdə yoxlanması |
| A03 Software Supply Chain | [x] npm audit, lockfile; production build | [ ] CI icazələri, secret scanning, SBOM və asılılıq yeniləmələrinin davamlı izlənməsi |
| A04 Cryptographic Failures | [x] HTTPS; browser cookie Secure/Lax kodu; server-only admin client | [ ] Backup şifrələnməsi, secret rotation; subdomain cookie təhlükə modeli |
| A05 Injection | [x] Parametrli Supabase sorğuları; JSON-LD `<` escaping; şəkil decode/yenidən kodlama testləri; qeyri-string axtarış rəddi | [ ] Məhsul/rəy/mesaj/SEO üzrə stored-XSS ssenarilərinin test hesablarında icrası |
| A06 Insecure Design | [x] Atomik checkout SQL-də qiymət DB-dən, `FOR UPDATE`; rol/mağaza feature guards | [ ] Variant stokları və promo snapshot-ları üzrə paralel sifariş ssenariləri |
| A07 Authentication Failures | [x] Auth, session revocation, cookie scope, auth authority və rate-limit testləri | [ ] Paralel cəhdlər və paylanmış password spray testi yalnız staging-də |
| A08 Software/Data Integrity | [x] Telegram secret rəddi; import idempotency və DB write guards testləri | [ ] Bütün webhook-ların replay və idempotency matrisi; kart provayderi inteqrasiya edilməyib |
| A09 Logging/Alerting | [x] Audit metadata sanitizasiyası kod baxışı; səhv cavablarda secret qaytarılmır | [ ] Log retention, operator alert delivery, PII redaction üzrə əməliyyat yoxlaması |
| A10 Exceptional Conditions | [x] JSON malformed/oversized, invalid filters, integration fail-closed testləri | [ ] DB/Redis timeout, qismən sifariş və bərpa ssenarilərinin staging-də fault injection testi |

BOLA/IDOR ssenariləri ayrıca OWASP API1:2023 ilə də əlaqələndirilir.

## Tapıntılar və prioritetlər

| ID | Prioritet / status | Sübut və təsir | Remediation |
|---|---|---|---|
| SEC-01 | Orta, düzəldildi | Search tracking `request.json()` üçün ayrıca byte limiti yox idi; böyük body parse-dan keçirdi | Bounded stream reader + 413, JSON-only + 415, schema + 400; 10 yeni test |
| SEC-02 | Orta, qalıq risk | `recordAuthRateLimitAttempt` əvvəl SELECT, sonra UPSERT edir. Paralel sorğular eyni counter-i oxuyub artımları itirə bilər | Counter artımını SQL RPC/Redis atomic INCR-a keçirmək; pəncərə və bloklamanı həmin atomik əməliyyatda hesablamaq. Canlı DB miqrasiyası bu dəyişiklikdə edilməyib |
| SEC-03 | Orta, sərtləşdirmə | CSP `script-src 'unsafe-inline'` saxlayır. Təsdiqlənmiş XSS tapılmayıb, ancaq müdafiə qatının gücü zəifləyir | Next SSR/RSC ilə uyğun request nonce tətbiqi; script/style nonce-ları və hydration üçün E2E yoxlama; təkcə unsafe-inline-ı silmək olmaz |
| SEC-04 | Şərti orta, konfiqurasiya yoxlanmalıdır | VDS `getClientIp()` CF/X-Real-IP daxil olmaqla header-lara etibar edir. Origin birbaşa açıqdırsa forged header limitləri zəiflədə bilər | Origin ingress-i etibarlı proxy-lərlə məhdudlaşdırmaq; Nginx real_ip yalnız trusted aralıqlardan, tətbiqə overwrite edilmiş tək header; Vercel və VDS yollarını ayrı saxlamaq |
| UI-01 | Aşağı, düzəldildi | Səbət rəqəmi nişan içində kəsilirdi | 22px, line-height1, numeric font və 99+ |

Login üçün yalnız account identifier bucket istifadə olunması mövcud dizayn seçimidir: ortaq mobil IP-də ayrı istifadəçilərin bloklanmasının qarşısını alır. Bunun qarşılığı olaraq geniş account spraying üçün əlavə edge/device siyasəti staging testləri ilə qiymətləndirilməlidir. Bu audit limitləri sıfırlamayıb və real hesablara brute-force etməyib.

## İcra edilə bilən təhlükəsiz yoxlamalar

Node 22+; heç bir cookie/token göndərmir. GET-lər və yazı yaratmamalı olan invalid POST-lar işləyir. Script uğurlu axtarış, sifariş və webhook əməliyyatı yaratmır.

```sh
node docs/security/safe-http-audit.mjs https://alisveris.az
npm test
npm run typecheck
npm audit
npm run build
```

Konkret curl nümunələri (gözlənən HTTP kodları):

```sh
# 200, guest: authenticated=false, role=null, private/no-store
curl -i https://alisveris.az/api/auth/session
# 400, səhv qiymət aralığı
curl -i 'https://alisveris.az/api/marketplace/products?minPrice=20&maxPrice=1'
# 403, CSRF/cross-origin rəddi, DB yazısı olmamalıdır
curl -i https://alisveris.az/api/marketplace/searches -H 'Origin: https://attacker.example' -H 'Content-Type: application/json' --data '{"term":"audit"}'
# 400, NoSQL tipli object qəbul edilmir (backend PostgreSQL-dir)
curl -i https://alisveris.az/api/marketplace/searches -H 'Content-Type: application/json' --data '{"term":{"$ne":null}}'
# 415, browser form/text body rəddi
curl -i https://alisveris.az/api/marketplace/searches -H 'Content-Type: text/plain' --data 'term=test'
# 403, autentifikasiyasız webhook handler işləməməlidir
curl -i https://alisveris.az/api/telegram/webhook -H 'Content-Type: application/json' --data '{}'
# 400 və ya boş normal JSON nəticəsi; SQL exception/stack/token olmamalıdır
curl -G -i https://alisveris.az/api/marketplace/products --data-urlencode "q=' OR 1=1--" --data-urlencode 'limit=2'
# XSS mətn olaraq qalmalıdır, HTML executable kontekstə keçirilməməlidir
curl -G -i https://alisveris.az/products --data-urlencode 'q=<img src=x onerror=alert(1)>'
```

Son iki curl yalnız cavabı müşahidə edir; XSS-in işləmədiyini sübut etmək üçün brauzerdə həm render, həm DOM və console yoxlanmalıdır. Marker-in JSON-da görünməsi təkbaşına XSS deyil.

## BOLA/IDOR, JWT və RLS — iki test hesabı matrisi

Yalnız staging-də disposable alıcı A/B, satıcı A/B və admin hesabları istifadə edin. Real müştəri identifikatorlarını təxmin etməyin. Sessiya A ilə A/B fixture ID-ləri müqayisə edilməlidir. Tətbiqin sifariş/redaktə mutation-ları Next Server Actions-dır; uydurma `/api/orders/:id` endpoint-i istifadə edilməməlidir.

```sh
npm test -- tests/authorization.test.ts tests/admin-product-edit.test.ts tests/marketplace-write-guards.test.ts tests/auth-cookie-scope.test.ts tests/client-auth-authority.test.ts tests/rate-limits.test.ts tests/storage.test.ts tests/search-request-security.test.ts
```

Supabase RLS-in ayrıca staging yoxlaması (dəyişənləri öz test mühitinizdə qurun; service_role istifadə etməyin):

```sh
# Test JWT A + digər satıcının fixture məhsulu. Yalnız aktiv public məhsuldursa oxuna bilər.
curl -i "$STAGING_SUPABASE_URL/rest/v1/products?id=eq.$SELLER_B_DRAFT_PRODUCT&select=id,name" \
  -H "apikey: $STAGING_ANON_KEY" -H "Authorization: Bearer $SELLER_A_TEST_JWT"
# Gözlənən: draft B məlumatı qaytarılmır (200 [] və ya policy rəddi).
```

| Ssenari | Gözlənən nəticə |
|---|---|
| Guest protected dashboard/RAdmin | Login redirect; heç bir şəxsi məlumat render edilməməlidir |
| Seller A, seller B draft product read/write | 403/404 və ya boş RLS nəticəsi; DB dəyişməz |
| Buyer A, buyer B order/address/message | Məlumat qaytarılmır; yazı baş vermir |
| Expired/forged JWT və yalnız localStorage-da admin rolu | Server guest/denied, heç bir admin əməliyyatı |
| Seller moderation/status/owner/role özbaşına yüksəltməsi | Server/RLS rəddi, audit qeydində secret olmamalıdır |
| Logout sonrası başqa tab; revoked session | Tablar yenilənir, server yeni privileged sorğunu rədd edir |
| Public/admin cookie scope qarışdırılması | Ayrı auth scope; public role admin scope-a keçid vermir |

## Staging-də əlavə biznes və injection testləri

- SQLi: axtarış/sort/cursor/category daxilinə quote, boolean ifadə, uzun input; məhdud nəticə, SQL xəta/stack yoxdur. Supabase parametrli filter-ləri saxlanmalıdır; raw SQL string birləşdirmə edilməməlidir.
- Stored XSS: yalnız test məhsul/rəy/mesajına `<img src=x onerror=alert(1)>`, `</script><script>alert(1)</script>` və `javascript:` linki; public detail, seller panel, RAdmin və SEO script DOM-larında executable olmamalıdır. Fixture-ləri normal cleanup ilə silin.
- CSRF: staging browser-dən external Origin + Next-Action sorğusu; Next-in built-in Origin/Host yoxlaması və JSON mutation guard rədd etməlidir. Cross-origin GET ilə state dəyişən route olmamalıdır.
- Miqdar: 0, -1, 1.5, NaN, çox böyük rəqəm; action və DB rədd etməlidir. `CartItem` qiyməti authority sayılmır.
- Qiymət: DevTools/request fixture-də qiyməti 0/1 etmək; sifariş qiyməti DB-dən hesablanmalıdır. Müsbət test yalnız staging-dədir.
- Idempotency: eyni checkout request ID-ni iki dəfə göndərmək → eyni sifariş; paralel son stok alışında oversell olmamalıdır. Variantlar ayrıca yoxlanmalıdır.
- Promo: vaxtı bitmiş, başqa mağazanın kodu, saxta endirim və paralel istifadə; server təsdiqi tələb olunur.
- Rate-limit: sequential və parallel testlərdə limit sonrasında auth rəddi; load generator canlı sayta yönəldilməməlidir. Recovery/email/WhatsApp spam testi real ünvanlara edilməməlidir.
- Upload: fake JPEG, SVG/script, çox böyük fayl, decoder bomb → storage yazısından əvvəl rədd. `storage.test.ts` həqiqi byte decode və WebP conversion-u yoxlayır.
- CORS: xarici Origin-lə sessiya GET cavabı brauzerdə oxuna bilməməlidir; credential-lərlə `Access-Control-Allow-Origin: *` olmamalıdır. curl CORS-u enforce etmir.

## Təhlükəsiz kod nümunələri / qalan patch-lər

Atomik rate counter nümunəsi — ayrıca miqrasiya və parallel regression testi ilə uyğunlaşdırılmalıdır:

```sql
-- Bir SQL statement counter-in SELECT→UPSERT yarışını aradan qaldırır.
insert into public.auth_rate_limits
  (bucket_key, endpoint, bucket_type, attempts, window_start)
values (p_bucket_key, p_endpoint, p_bucket_type, 1, now())
on conflict (bucket_key) do update set
  attempts = case
    when auth_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
      then 1 else auth_rate_limits.attempts + 1 end,
  window_start = case
    when auth_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
      then now() else auth_rate_limits.window_start end
returning attempts;
-- Production RPC: blocked_until hesabı da eyni transaction daxilində;
-- search_path sabit, EXECUTE yalnız service_role, input/pəncərə limitləri sərt.
```

Obyekt səviyyəsi üzrə prinsip (proyektin mövcud requireRole/ownership pattern-i):

```ts
const current = await requireRole(["seller", "admin"]);
const product = await loadProduct(productId);
if (current.role !== "admin" && product.ownerId !== current.user.id) {
  return { ok: false, message: "Bu əməliyyat üçün icazəniz yoxdur." };
}
// update allowlist: name/description/price; ownerId/storeId/role request-dən götürülmür.
// RLS də eyni sərhədi qoruyur. Service client ownership yoxlamasını əvəz etmir.
```

JSON-LD üçün mövcud təhlükəsiz serializer:

```ts
const html = JSON.stringify(data).replace(/</g, "\\u003c");
// Rich text varsa ayrıca allowlist sanitization; JSON escaping HTML sanitizer deyil.
```

## Komponent strukturu və responsive qaydalar

```text
MarketplaceHeader → MarketplaceBrand / MarketplaceSearch / HeaderAccountActions / cart badge
MobileBottomNav → əsas alış-veriş keçidləri
HomeExperience → hero / kateqoriyalar / ProductMarketplace / mağazalar
ProductMarketplace → filter/sort toolbar / ProductCard
AuthSplitScreen → form / desktop artwork
```

- Mobil <768: 109px sticky başlıq (auth 55px), 2 sütun məhsul, 4 sütun kateqoriya, alt naviqasiya; auth şəkli və təkrarlanan promo gizli.
- Planşet 768–1024: mövcud orta breakpoint-lər, uyğunlaşan grid və menyu.
- Desktop 1280+: tam header/nav, geniş grid; mobile dəyişiklikləri media query ilə sərhədlənir.
- Light/Dark mövcud `ThemeToggle` və `.dark` token strukturu ilə; focus ring və reduced-motion qaydaları saxlanır.
- Axtarış debounce, server pagination və şəkil lazy-loading saxlanır. Performans üçün nəticələr ölçülmədən Lighthouse balı iddia edilmir.

Mənbələr: [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/), [API Top 10:2023](https://api-security.owasp.org/editions/2023/en/0x11-t10/).

## Yoxlama qeydi

- 37 test faylında 214 test keçdi; 10 yeni test sərhəd ölçüsü, malformed JSON, yanlış tip/content-type və cross-site rəddini yoxlayır.
- TypeScript və production build keçdi. `npm audit` cavabı: 0 məlum zəiflik; bu nəticə custom kodun təhlükəsizliyinə zəmanət deyil.
- Canlı guest session JSON yalnız `authenticated` və `role` qaytardı. Səhv qiymət aralığı 400; secret-siz Telegram webhook və xarici Origin search POST 403 qaytardı.
- Heç bir real sifariş, ödəniş, istifadəçi rolu və ya satıcı məhsulu dəyişdirilməyib. Stored XSS və brute-force payload-ları canlı hesablarda saxlanmayıb.

Badge və mobil CSS nümunəsi (işləyən komponentdə tətbiq edilib):

```tsx
<Link className="live-cart-link" href="/cart" aria-label={`Səbətim, ${count} məhsul`}>
  <span><ShoppingBag size={24} /><b aria-hidden="true">{count > 99 ? "99+" : count}</b></span>
  <span>Səbətim<small>{count} məhsul</small></span>
</Link>
```

```css
.live-cart-link > span:first-child { position: relative; }
.live-cart-link b {
  position: absolute; top: -5px; right: -6px;
  min-width: 22px; height: 22px; padding: 0 4px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px; font-size: 11px; line-height: 1;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
@media (max-width: 767px) {
  .live-cart-link { min-width: 44px; min-height: 44px; }
}
```

Responsive son yoxlama: 320/375/430/768/1024/1440 px enlərdə daşma yoxdur. Mobil menyu/səbət/axtarış/favorit düymələri 44×44 px ölçüldü; nişan 22×22 px. Dark rejimdə açıq hero şəkli üzərində mətn/CTA kontrastı düzəldildi.
